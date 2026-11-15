import os

import uvicorn

from app.main import app

if __name__ == "__main__":
    # Most PaaS providers inject the port to bind on.
    port = int(os.getenv("PORT", "65433"))
    uvicorn.run(app, host="0.0.0.0", port=port)
