# Episteme Backend - Hugging Face Spaces Deployment Guide

Deploy this backend directly to a Hugging Face Space (Docker SDK) using the commands below.

## 🚀 Step-by-Step Deployment

### 1. Create the Space on Hugging Face
1. Go to [huggingface.co/new-space](https://huggingface.co/new-space).
2. Name your space (e.g. `episteme-backend`).
3. Select **Docker** as the SDK.
4. Select **Blank** (or any OS template) as the template.
5. Set the Space to **Public** or **Private** (API calls from the extension will work for both).

### 2. Push the Code via Git
Open your command line, navigate to this `backend` folder, and run:

```bash
# Initialize a separate git repo inside the backend folder
git init

# Add the Hugging Face Space repository as a remote origin
# (Replace with your actual Space git URL from the Hugging Face interface)
git remote add origin https://huggingface.co/spaces/<YOUR_USERNAME>/<YOUR_SPACE_NAME>

# Stage and commit only the backend files
git add App/ Dockerfile requirements.txt
git commit -m "Deploy Episteme FastAPI backend"

# Push to Hugging Face (will trigger the Docker container build)
git push -f origin master
```

### 3. Add Environment Secrets
In your Hugging Face Space settings panel, add the following variables under **Variables and Secrets**:

| Secret Key | Value Source | Required? |
| :--- | :--- | :--- |
| `NVIDIA_API_KEY` | Your NVIDIA NIM API credentials | **Yes** (Runs agent pipelines) |
| `SUPABASE_URL` | Supabase endpoint | Optional (Enables DB cache) |
| `SUPABASE_KEY` | Supabase service key | Optional (Enables DB cache) |
| `QDRANT_URL` | Qdrant Cloud Cluster endpoint | Optional (Enables persistent memory) |
| `QDRANT_API_KEY` | Qdrant Access Token | Optional (Enables persistent memory) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis connection string | Optional (Enables Redis cache) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis API Token | Optional (Enables Redis cache) |

---

## 🔌 Connecting your Browser Extension
Once the Space build is complete (the status turns to a green **Running** badge):
1. Copy the Space's direct app URL by clicking **Embed this Space** -> **Direct URL** or clicking the top-right menu -> **Copy Direct URL**.
   - It will look like: `https://<your-username>-<your-space-name>.hf.space`
2. Open the **Episteme** extension sidebar in your browser.
3. Click on the **Settings** tab.
4. Paste the URL into the **Backend API Base URL** field.
5. Click **Test Connection** (should show **Online**).
6. Click **Save Configuration**.
