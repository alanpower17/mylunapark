"""
Google Forms & Sheets Integration for MyLunaPark
Creates Google Forms for ride data collection and syncs with Google Sheets
"""

import os
import json
import logging
from pathlib import Path
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import gspread

logger = logging.getLogger(__name__)

# Credentials file path
CREDENTIALS_FILE = Path(__file__).parent / 'google_credentials.json'

# Scopes needed for Forms, Sheets, and Drive
SCOPES = [
    'https://www.googleapis.com/auth/forms.body',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file'
]

def get_credentials():
    """Get Google API credentials from service account file"""
    if not CREDENTIALS_FILE.exists():
        logger.error("Google credentials file not found")
        return None
    
    try:
        credentials = service_account.Credentials.from_service_account_file(
            str(CREDENTIALS_FILE),
            scopes=SCOPES
        )
        return credentials
    except Exception as e:
        logger.error(f"Error loading credentials: {e}")
        return None

def create_google_form(park_name: str, city: str) -> dict:
    """
    Create a Google Form for collecting ride data
    Returns: dict with form_id, form_url, edit_url
    """
    credentials = get_credentials()
    if not credentials:
        return {"error": "Credentials not available"}
    
    try:
        # Build Forms API service
        forms_service = build('forms', 'v1', credentials=credentials)
        
        # Create the form
        form_body = {
            "info": {
                "title": f"MyLunaPark - {park_name} ({city})",
                "documentTitle": f"Coupon {park_name}"
            }
        }
        
        form = forms_service.forms().create(body=form_body).execute()
        form_id = form['formId']
        
        # Add questions to the form
        questions_update = {
            "requests": [
                {
                    "createItem": {
                        "item": {
                            "title": "Nome Giostra",
                            "description": "Inserisci il nome della tua giostra (obbligatorio)",
                            "questionItem": {
                                "question": {
                                    "required": True,
                                    "textQuestion": {
                                        "paragraph": False
                                    }
                                }
                            }
                        },
                        "location": {"index": 0}
                    }
                },
                {
                    "createItem": {
                        "item": {
                            "title": "Sconto",
                            "description": "Es: 1€ di sconto, 50 centesimi, ecc. (obbligatorio)",
                            "questionItem": {
                                "question": {
                                    "required": True,
                                    "textQuestion": {
                                        "paragraph": False
                                    }
                                }
                            }
                        },
                        "location": {"index": 1}
                    }
                },
                {
                    "createItem": {
                        "item": {
                            "title": "Numero Giostra",
                            "description": "Numero identificativo della giostra (opzionale)",
                            "questionItem": {
                                "question": {
                                    "required": False,
                                    "textQuestion": {
                                        "paragraph": False
                                    }
                                }
                            }
                        },
                        "location": {"index": 2}
                    }
                },
                {
                    "createItem": {
                        "item": {
                            "title": "Cognome Titolare",
                            "description": "Cognome del titolare della giostra (opzionale)",
                            "questionItem": {
                                "question": {
                                    "required": False,
                                    "textQuestion": {
                                        "paragraph": False
                                    }
                                }
                            }
                        },
                        "location": {"index": 3}
                    }
                }
            ]
        }
        
        forms_service.forms().batchUpdate(formId=form_id, body=questions_update).execute()
        
        # Get the form URLs
        form_info = forms_service.forms().get(formId=form_id).execute()
        
        return {
            "success": True,
            "form_id": form_id,
            "form_url": form_info.get('responderUri', f"https://docs.google.com/forms/d/{form_id}/viewform"),
            "edit_url": f"https://docs.google.com/forms/d/{form_id}/edit"
        }
        
    except HttpError as e:
        logger.error(f"Google API error creating form: {e}")
        return {"error": str(e)}
    except Exception as e:
        logger.error(f"Error creating form: {e}")
        return {"error": str(e)}

def create_google_sheet(park_name: str, city: str, organizer_email: str = None, form_id: str = None) -> dict:
    """
    Create a Google Sheet for storing ride/coupon data
    Returns: dict with sheet_id, sheet_url
    """
    credentials = get_credentials()
    if not credentials:
        return {"error": "Credentials not available"}
    
    try:
        # Use gspread for easier sheet manipulation
        gc = gspread.authorize(credentials)
        
        # Create the spreadsheet
        spreadsheet = gc.create(f"MyLunaPark - {park_name} ({city})")
        
        # Get the first worksheet
        worksheet = spreadsheet.sheet1
        worksheet.update_title("Coupon")
        
        # Add headers
        headers = ["Timestamp", "Nome Giostra", "Sconto", "Numero Giostra", "Cognome Titolare", "Importato"]
        worksheet.append_row(headers)
        
        # Format headers (bold)
        worksheet.format('A1:F1', {
            'textFormat': {'bold': True},
            'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9}
        })
        
        # CRITICAL: Share with service account email to allow API access
        SERVICE_ACCOUNT_EMAIL = 'mylunapark-service@mylunapark.iam.gserviceaccount.com'
        try:
            spreadsheet.share(SERVICE_ACCOUNT_EMAIL, perm_type='user', role='writer', notify=False)
            logger.info(f"Shared sheet with service account: {SERVICE_ACCOUNT_EMAIL}")
        except Exception as e:
            logger.warning(f"Could not share with service account: {e}")
        
        # Share with organizer email if provided
        if organizer_email:
            try:
                spreadsheet.share(organizer_email, perm_type='user', role='writer', notify=True, 
                                email_message=f"Ecco il tuo Google Sheet per gestire i coupon di {park_name}!")
                logger.info(f"Shared sheet with organizer: {organizer_email}")
            except Exception as e:
                logger.warning(f"Could not share with organizer: {e}")
        
        return {
            "success": True,
            "sheet_id": spreadsheet.id,
            "sheet_url": spreadsheet.url
        }
        
    except Exception as e:
        logger.error(f"Error creating sheet: {e}")
        return {"error": str(e)}

def link_form_to_sheet(form_id: str, sheet_id: str) -> dict:
    """
    Link a Google Form to a Google Sheet for responses
    Note: This requires the form to be set up for responses manually or via Apps Script
    """
    # Note: The Google Forms API doesn't support automatic linking to existing sheets
    # This functionality would require manual setup or Apps Script deployment
    return {"success": True, "message": "Form and Sheet created (manual linking may be required)"}

def get_sheet_data(sheet_id: str) -> dict:
    """
    Get all data from a Google Sheet
    Returns: dict with rows of data
    """
    credentials = get_credentials()
    if not credentials:
        return {"error": "Credentials not available"}
    
    try:
        gc = gspread.authorize(credentials)
        spreadsheet = gc.open_by_key(sheet_id)
        worksheet = spreadsheet.sheet1
        
        # Get all records as dictionaries
        records = worksheet.get_all_records()
        
        return {
            "success": True,
            "data": records,
            "count": len(records)
        }
        
    except Exception as e:
        logger.error(f"Error reading sheet: {e}")
        return {"error": str(e)}

def add_row_to_sheet(sheet_id: str, data: dict) -> dict:
    """
    Add a row to a Google Sheet
    """
    credentials = get_credentials()
    if not credentials:
        return {"error": "Credentials not available"}
    
    try:
        gc = gspread.authorize(credentials)
        spreadsheet = gc.open_by_key(sheet_id)
        worksheet = spreadsheet.sheet1
        
        from datetime import datetime
        row = [
            datetime.now().isoformat(),
            data.get('nome_giostra', ''),
            data.get('sconto', ''),
            data.get('numero_giostra', ''),
            data.get('cognome_titolare', ''),
            'No'  # Importato flag
        ]
        
        worksheet.append_row(row)
        
        return {"success": True, "message": "Row added"}
        
    except Exception as e:
        logger.error(f"Error adding row: {e}")
        return {"error": str(e)}

def create_form_and_sheet_for_park(park_name: str, city: str, organizer_email: str = None) -> dict:
    """
    Create both a Google Form and Sheet for a Luna Park
    Returns combined info
    """
    # Create the sheet first
    sheet_result = create_google_sheet(park_name, city, organizer_email)
    if "error" in sheet_result:
        return sheet_result
    
    # Create the form
    form_result = create_google_form(park_name, city)
    if "error" in form_result:
        return {**sheet_result, **form_result}
    
    return {
        "success": True,
        "form_id": form_result.get("form_id"),
        "form_url": form_result.get("form_url"),
        "form_edit_url": form_result.get("edit_url"),
        "sheet_id": sheet_result.get("sheet_id"),
        "sheet_url": sheet_result.get("sheet_url")
    }

# Test function
if __name__ == "__main__":
    result = create_form_and_sheet_for_park("Test Luna Park", "Roma")
    print(json.dumps(result, indent=2))
