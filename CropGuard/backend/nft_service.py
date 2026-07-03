import os
import uuid

def generate_farm_nft(farm_id: int, risk_level: str, ndvi: str) -> str:
    # Color logic
    bg_color = "#10B981" if risk_level == "low" else "#F59E0B" if risk_level == "medium" else "#EF4444"
    
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{bg_color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e1e1e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="20" fill="url(#grad1)" />
  <circle cx="200" cy="150" r="80" fill="rgba(255,255,255,0.1)" stroke="white" stroke-width="4"/>
  <text x="50%" y="80" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="24" font-weight="bold" fill="white">CropGuard Badge</text>
  <text x="50%" y="150" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" font-weight="bold" fill="white">FARM #{farm_id}</text>
  <text x="50%" y="270" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="white">NDVI Score: {ndvi}</text>
  <text x="50%" y="310" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="white">Risk Level: {risk_level.upper()}</text>
  <text x="50%" y="360" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="14" fill="rgba(255,255,255,0.7)">DYNAMIC NFT</text>
</svg>"""

    base_dir = os.path.dirname(os.path.abspath(__file__))
    nfts_dir = os.path.join(base_dir, "nfts")
    os.makedirs(nfts_dir, exist_ok=True)
    
    filename = f"farm_{farm_id}_{uuid.uuid4().hex[:8]}.svg"
    filepath = os.path.join(nfts_dir, filename)
    
    with open(filepath, "w") as f:
        f.write(svg)
        
    return f"/nfts/{filename}"
