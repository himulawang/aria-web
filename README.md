# AriaWeb

`aria-web` is a modern, lightweight web interface for `aria2`, designed as a high-performance migration from AriaNg. It focuses on providing a responsive and intuitive user experience while maintaining a minimal footprint.

## 🎯 Purpose

The primary goal of `aria-web` is to migrate the full feature set of AriaNg into a more modern architecture. By leveraging **SolidJS**, the project aims to eliminate the overhead of a virtual DOM, resulting in faster rendering and lower memory usage, making it ideal for users who want a snappy, lightweight control panel for their `aria2` instance.

## 🛠 Technical Stack

### Frontend
- **Framework**: [SolidJS](https://www.solidjs.com/) - A declarative, efficient library for building user interfaces without a virtual DOM.
- **Build Tool**: [Vite](https://vitejs.dev/) - Next-generation frontend tooling for fast development and optimized production builds.
- **Language**: [TypeScript](https://www.typescriptlang.org/) - For strong typing and improved maintainability.
- **Styling**: 
  - [Tailwind CSS 4.x](https://tailwindcss.com/) - Utility-first CSS framework for rapid UI development.
  - [DaisyUI](https://daisyui.com/) - A popular component library for Tailwind CSS.
- **Icons**: `solid-icons` - Optimized icon set for SolidJS.

### Deployment
- **Containerization**: Docker
- **Web Server**: `static-web-server` (SWS) - A high-performance, lightweight static file server used to serve the production build.

## 🚀 Development Methodology

The project follows a structured migration path from AriaNg to ensure feature parity and stability:

## 🐳 Docker Usage

`aria-web` is packaged as a Docker image using a multi-stage build process to ensure the final image is as small as possible.

### Run with Docker Compose / Docker Run

You can deploy `aria-web` using the pre-built image from GitHub Container Registry (GHCR).

#### Docker Compose

Add the following snippet to your `docker-compose.yml` file:

```yaml
services:
  aria-web:
    image: ghcr.io/himulawang/aria-web:v0.4.1
    container_name: aria-web
    restart: unless-stopped
    ports:
      - "6881:80" # 访问这个端口打开下载界面
```

#### Docker Run

To achieve the same functionality using a pure `docker run` command, run:

```bash
docker run -d \
  --name aria-web \
  --restart unless-stopped \
  -p 6881:80 \
  ghcr.io/himulawang/aria-web:v0.4.1
```

### Build and Run Locally

To build the image locally:
```bash
docker build -t aria-web .
```

To run the locally built container:
```bash
docker run -d -p 6881:6881 --name aria-web aria-web
```

### Docker Configuration
The image uses `static-web-server` (SWS) to serve the files. You can configure the server using environment variables:

| Environment Variable | Default Value | Description |
|----------------------|---------------|-------------|
| `SWS_PORT`           | `6881`          | The port the server listens on. |
| `SWS_INDEX_FILE`     | `index.html`  | The default index file. |
| `SWS_FALLBACK_FILE`  | `index.html`  | File served for 404s (enables SPA routing). |

## 🛠 Local Development

If you wish to develop locally:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npx vite --host 0.0.0.0
   ```
3. Build for production:
   ```bash
   npx vite build
   ```
