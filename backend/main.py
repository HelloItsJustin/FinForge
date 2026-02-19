"""FinForge API — FastAPI application."""


import io
import os
import json
import uuid
import tempfile
import traceback
from datetime import datetime, timezone


from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse


from detector import MoneyMulingDetector


app = FastAPI(title="FinForge API", version="2.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Persistent cache path
CACHE_FILE = os.path.join(tempfile.gettempdir(), "finforge_v2_cache.json")


def _load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                data = json.load(f)
                valid_data = {k: v for k, v in data.items() if isinstance(v, dict)}
                print(f"[FinForge] Cache loaded: {len(valid_data)} records from {CACHE_FILE}")
                return valid_data
        except Exception as e:
            print(f"[FinForge] Warning: Could not load cache: {e}")
    return {}


def _save_cache(cache):
    try:
        to_save = {}
        for k, v in cache.items():
            if isinstance(v, dict):
                to_save[k] = v
        with open(CACHE_FILE, "w") as f:
            json.dump(to_save, f)
        print(f"[FinForge] Cache saved successfully to {CACHE_FILE}")
    except Exception as e:
        print(f"[FinForge] ERROR: Failed to save cache: {e}")
        traceback.print_exc()


# Initial load
_results_cache = _load_cache()


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cache_count": len(_results_cache),
        "cache_path": CACHE_FILE
    }


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    print(f"\n[FinForge] === NEW UPLOAD: {file.filename} ===")
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = await file.read()
    try:
        # Fresh detector instance per request — prevents merchant_whitelist
        # from leaking between different CSV uploads
        fresh_detector = MoneyMulingDetector()
        df = fresh_detector.parse_csv(io.BytesIO(content))
        print(f"[FinForge] CSV parsed: {len(df)} rows")

        print(f"[FinForge] Running detection pipeline...")
        result = fresh_detector.run(df)
        aid = result["analysis_id"]

        # Update and persist
        _results_cache[aid] = result
        _save_cache(_results_cache)

        print(f"[FinForge] Analysis complete. Generated ID: {aid}")
        return JSONResponse(content=result)

    except Exception as e:
        print(f"[FinForge] ERROR during upload/analysis:")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Analysis failed: {str(e)}")


@app.get("/api/report/{analysis_id}")
async def report(analysis_id: str):
    print(f"\n[FinForge] === REPORT REQUEST (GET): {analysis_id} ===")

    # Reload from disk to catch updates from other processes/restarts
    current_cache = _load_cache()
    results = current_cache.get(analysis_id)

    if not results:
        available_ids = list(current_cache.keys())
        print(f"[FinForge] 404: ID {analysis_id} not in cache.")
        print(f"[FinForge] Available IDs in {CACHE_FILE}: {available_ids}")
        raise HTTPException(
            status_code=404,
            detail="Analysis records not found. Please upload the CSV again to generate a new analysis."
        )

    try:
        print(f"[FinForge] Generating PDF report from cache...")
        # Fresh detector for report generation (stateless for PDF)
        report_detector = MoneyMulingDetector()
        filepath = report_detector.generate_forensic_report(results, analysis_id)

        if not os.path.exists(filepath):
            raise FileNotFoundError(f"PDF file missing after generation at {filepath}")

        print(f"[FinForge] Serving PDF: {filepath}")
        return FileResponse(
            path=filepath,
            media_type="application/pdf",
            filename=f"FinForge_Report_{analysis_id}.pdf",
        )
    except Exception as e:
        print(f"[FinForge] CRITICAL: Report generation failed:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@app.post("/api/report/full")
async def report_full(results: dict):
    """Generate PDF from full analysis JSON provided by frontend (supports mock data)."""
    analysis_id = results.get("analysis_id", f"adhoc_{str(uuid.uuid4())[:8]}")
    print(f"\n[FinForge] === REPORT REQUEST (POST): {analysis_id} ===")

    try:
        print(f"[FinForge] Generating PDF report from provided JSON...")
        # Fresh detector for report generation (stateless for PDF)
        report_detector = MoneyMulingDetector()
        filepath = report_detector.generate_forensic_report(results, analysis_id)

        if not os.path.exists(filepath):
            raise FileNotFoundError(f"PDF file missing after generation at {filepath}")

        print(f"[FinForge] Serving PDF: {filepath}")
        return FileResponse(
            path=filepath,
            media_type="application/pdf",
            filename=f"FinForge_Report_{analysis_id}.pdf",
        )
    except Exception as e:
        print(f"[FinForge] CRITICAL: Ad-hoc report generation failed:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
