# Start a simple HTTP server (Python 3 required)
$port = 8000
try {
    python -m http.server $port
} catch {
    py -3 -m http.server $port
}