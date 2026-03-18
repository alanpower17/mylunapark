"""
Script per pulire i file dal Drive del service account
Elimina tutti i file Google Forms e Sheets creati per liberare spazio
"""

import sys
from google_integration import get_credentials
from googleapiclient.discovery import build

def list_and_delete_files():
    """Lista ed elimina tutti i file dal Drive del service account"""
    credentials = get_credentials()
    if not credentials:
        print("❌ Errore: credenziali non trovate")
        return
    
    try:
        # Build Drive API service
        drive_service = build('drive', 'v3', credentials=credentials)
        
        # List all files
        print("🔍 Ricerca file nel Drive del service account...")
        results = drive_service.files().list(
            pageSize=100,
            fields="files(id, name, mimeType, createdTime, size)"
        ).execute()
        
        files = results.get('files', [])
        
        if not files:
            print("✅ Nessun file trovato. Il Drive è già pulito!")
            return
        
        print(f"\n📋 Trovati {len(files)} file:")
        total_size = 0
        
        for i, file in enumerate(files, 1):
            size = int(file.get('size', 0))
            total_size += size
            size_mb = size / (1024 * 1024)
            print(f"  {i}. {file['name'][:50]} ({size_mb:.2f} MB) - {file['mimeType']}")
        
        print(f"\n💾 Spazio totale occupato: {total_size / (1024 * 1024):.2f} MB")
        
        # Ask for confirmation
        response = input(f"\n⚠️  Vuoi eliminare TUTTI questi {len(files)} file? (si/no): ")
        
        if response.lower() not in ['si', 's', 'yes', 'y']:
            print("❌ Operazione annullata")
            return
        
        # Delete all files
        print("\n🗑️  Eliminazione in corso...")
        deleted = 0
        errors = 0
        
        for file in files:
            try:
                drive_service.files().delete(fileId=file['id']).execute()
                deleted += 1
                print(f"  ✅ Eliminato: {file['name'][:50]}")
            except Exception as e:
                errors += 1
                print(f"  ❌ Errore eliminando {file['name'][:50]}: {str(e)}")
        
        print(f"\n🎉 Operazione completata!")
        print(f"  ✅ File eliminati: {deleted}")
        if errors > 0:
            print(f"  ❌ Errori: {errors}")
        print(f"  💾 Spazio liberato: ~{total_size / (1024 * 1024):.2f} MB")
        
    except Exception as e:
        print(f"❌ Errore: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("🧹 PULIZIA DRIVE SERVICE ACCOUNT - MyLunaPark")
    print("=" * 60)
    list_and_delete_files()
