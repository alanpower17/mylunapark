"""
Script per verificare la quota del Drive del service account
"""

from google_integration import get_credentials
from googleapiclient.discovery import build

def check_quota():
    """Verifica la quota di storage del Drive"""
    credentials = get_credentials()
    if not credentials:
        print("❌ Errore: credenziali non trovate")
        return
    
    try:
        # Build Drive API service
        drive_service = build('drive', 'v3', credentials=credentials)
        
        # Get storage quota
        about = drive_service.about().get(fields="storageQuota,user").execute()
        
        print("=" * 60)
        print("📊 INFORMAZIONI DRIVE SERVICE ACCOUNT")
        print("=" * 60)
        
        if 'user' in about:
            print(f"\n👤 Utente: {about['user'].get('emailAddress', 'N/A')}")
        
        quota = about.get('storageQuota', {})
        
        if quota:
            limit = int(quota.get('limit', 0))
            usage = int(quota.get('usage', 0))
            usage_in_drive = int(quota.get('usageInDrive', 0))
            usage_in_trash = int(quota.get('usageInDriveTrash', 0))
            
            limit_gb = limit / (1024 ** 3)
            usage_gb = usage / (1024 ** 3)
            usage_drive_gb = usage_in_drive / (1024 ** 3)
            usage_trash_gb = usage_in_trash / (1024 ** 3)
            
            print(f"\n💾 Quota Storage:")
            print(f"  Limite totale: {limit_gb:.2f} GB")
            print(f"  Spazio usato: {usage_gb:.2f} GB ({usage / limit * 100:.1f}%)")
            print(f"  Usato in Drive: {usage_drive_gb:.2f} GB")
            print(f"  Usato nel Cestino: {usage_trash_gb:.2f} GB")
            print(f"  Spazio disponibile: {(limit - usage) / (1024 ** 3):.2f} GB")
            
            if usage >= limit:
                print("\n⚠️  ATTENZIONE: Quota esaurita!")
                print("  🗑️  Prova a svuotare il cestino del Drive")
            elif usage_trash_gb > 0:
                print(f"\n💡 Puoi liberare {usage_trash_gb:.2f} GB svuotando il cestino")
        else:
            print("\n❓ Informazioni sulla quota non disponibili")
            print("  Possibili cause:")
            print("  - Service account senza accesso alla quota")
            print("  - Progetto Google Cloud con limitazioni")
        
    except Exception as e:
        print(f"❌ Errore: {e}")

if __name__ == "__main__":
    check_quota()
