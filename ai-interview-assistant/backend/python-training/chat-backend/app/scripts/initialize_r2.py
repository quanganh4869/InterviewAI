import asyncio
import sys
import os

# Adjust path to import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import aiobotocore.session
from configuration.settings import configuration

async def main():
    if configuration.STORAGE_STRATEGY != "r2":
        print("STORAGE_STRATEGY is not 'r2' in configuration. Skipping R2 initialization.")
        return
        
    bucket_name = configuration.CLOUDFLARE_R2_BUCKET_NAME
    endpoint_url = configuration.CLOUDFLARE_R2_ENDPOINT
    access_key = configuration.CLOUDFLARE_R2_ACCESS_KEY_ID
    secret_key = configuration.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    region_name = configuration.CLOUDFLARE_R2_REGION
    
    if not all([bucket_name, endpoint_url, access_key, secret_key]):
        print("⚠️ Cloudflare R2 settings are not fully configured in your .env file.")
        print(f"  CLOUDFLARE_R2_BUCKET_NAME: {'SET' if bucket_name else 'MISSING'}")
        print(f"  CLOUDFLARE_R2_ENDPOINT: {'SET' if endpoint_url else 'MISSING'}")
        print(f"  CLOUDFLARE_R2_ACCESS_KEY_ID: {'SET' if access_key else 'MISSING'}")
        print(f"  CLOUDFLARE_R2_SECRET_ACCESS_KEY: {'SET' if secret_key else 'MISSING'}")
        return

    print(f"Connecting to Cloudflare R2 bucket '{bucket_name}'...")
    
    session = aiobotocore.session.get_session()
    async with session.create_client(
        "s3",
        region_name=region_name,
        endpoint_url=endpoint_url or None,
        aws_access_key_id=access_key or None,
        aws_secret_access_key=secret_key or None,
    ) as client:
        # Standard folder markers for the application
        folders = ["documents/", "interviews/"]
        
        # Add custom prefixes if configured
        if configuration.DOCUMENT_CV_PREFIX:
            folders.append(f"{configuration.DOCUMENT_CV_PREFIX.strip('/')}/")
        if configuration.DOCUMENT_JD_PREFIX:
            folders.append(f"{configuration.DOCUMENT_JD_PREFIX.strip('/')}/")
        if configuration.INTERVIEW_RECORDING_PREFIX:
            folders.append(f"{configuration.INTERVIEW_RECORDING_PREFIX.strip('/')}/")

        # De-duplicate folder suffixes
        folders = sorted(list(set([f for f in folders if f and f != "/"])))

        for folder in folders:
            print(f"Creating placeholder marker: {folder}")
            try:
                await client.put_object(
                    Bucket=bucket_name,
                    Key=folder,
                    Body=b""
                )
                print(f"  └─ Successfully initialized folder: {folder}")
            except Exception as e:
                print(f"  └─ ❌ Failed to create marker '{folder}': {e}")

    print("\nInitialization check complete.")

if __name__ == "__main__":
    asyncio.run(main())
