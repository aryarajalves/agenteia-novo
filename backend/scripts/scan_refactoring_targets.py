import os

def scan_dir(root_dir, exts, max_limit, warning_limit, exclude_dirs):
    results = []
    for root, dirs, files in os.walk(root_dir):
        # Exclude directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in exts:
                path = os.path.join(root, f)
                try:
                    with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                        lines = len(fp.readlines())
                    if lines >= warning_limit:
                        results.append((lines, path, lines > max_limit))
                except Exception:
                    pass
    return sorted(results, key=lambda x: x[0], reverse=True)

print("=== BACKEND SCAN (Python > 700 linhas, Limite: 1000) ===")
backend_files = scan_dir("backend", [".py"], 1000, 700, ["venv", "__pycache__", "codigo_obsoleto", ".pytest_cache", "backup"])
for lines, path, exceeded in backend_files:
    status = "[EXCEDIDO > 1000]" if exceeded else "[ATENCAO > 700]"
    print(f"{lines:4d} linhas | {status} | {path}")

print("\n=== FRONTEND SCAN (JS/JSX/TS/TSX/CSS > 400 linhas, Limite: 500) ===")
frontend_files = scan_dir("frontend/src", [".js", ".jsx", ".ts", ".tsx", ".css"], 500, 400, ["node_modules", "codigo_obsoleto", "dist", ".vite"])
for lines, path, exceeded in frontend_files:
    status = "[EXCEDIDO > 500]" if exceeded else "[ATENCAO > 400]"
    print(f"{lines:4d} linhas | {status} | {path}")
