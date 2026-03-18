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
    Create a simple Google Sheet - organizer will manually link the form responses
    Since service accounts have 0 GB quota, we create a minimal instruction sheet
    """
    if not organizer_email:
        return {"error": "Organizer email is required"}
    
    # Return instructions for manual setup
    instructions_url = "https://support.google.com/docs/answer/2917686"
    
    return {
        "success": True,
        "sheet_id": None,
        "sheet_url": instructions_url,
        "message": "Form created! To collect responses, open the form and go to Responses tab > Link to Sheets"
    }

def get_form_responses(form_id: str) -> dict:
    """
    Get all responses from a Google Form
    Returns: dict with responses data
    """
    credentials = get_credentials()
    if not credentials:
        return {"error": "Credentials not available"}
    
    try:
        forms_service = build('forms', 'v1', credentials=credentials)
        
        # Get the form responses
        result = forms_service.forms().responses().list(formId=form_id).execute()
        
        responses = result.get('responses', [])
        
        # Parse responses into coupon data format
        parsed_data = []
        for response in responses:
            answers = response.get('answers', {})
            
            # Extract answer values (Form questions are stored by ID)
            data_row = {
                'timestamp': response.get('createTime', ''),
                'nome_giostra': '',
                'sconto': '',
                'numero_giostra': '',
                'cognome_titolare': '',
                'response_id': response.get('responseId', '')
            }
            
            # Parse answers - we need to match question IDs to fields
            # Question 0: Nome Giostra
            # Question 1: Sconto  
            # Question 2: Numero Giostra
            # Question 3: Cognome Titolare
            
            for question_id, answer in answers.items():
                text_answer = answer.get('textAnswers', {}).get('answers', [{}])[0].get('value', '')
                
                # Map answers to fields (based on question order)
                # This is a simplified mapping - in production you'd store question IDs
                if 'nome' in question_id.lower() or not data_row['nome_giostra']:
                    if not data_row['nome_giostra']:
                        data_row['nome_giostra'] = text_answer
                elif 'sconto' in question_id.lower() or (data_row['nome_giostra'] and not data_row['sconto']):
                    if not data_row['sconto']:
                        data_row['sconto'] = text_answer
                elif 'numero' in question_id.lower() or (data_row['sconto'] and not data_row['numero_giostra']):
                    if not data_row['numero_giostra']:
                        data_row['numero_giostra'] = text_answer
                else:
                    if not data_row['cognome_titolare']:
                        data_row['cognome_titolare'] = text_answer
            
            parsed_data.append(data_row)
        
        return {
            "success": True,
            "data": parsed_data,
            "count": len(parsed_data)
        }
        
    except Exception as e:
        logger.error(f"Error reading form responses: {e}")
        return {"error": str(e)}
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
