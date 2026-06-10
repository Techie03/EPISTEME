import re
import math
from typing import List, Dict, Any

def detect_p_values(text: str) -> List[float]:
    """
    Extract p-values from text using regex.
    Supports formats like: p = 0.04, p < 0.001, p = .045, p-value of 0.03
    """
    p_values = []
    # Match patterns like: p = 0.042, p < 0.001, p < .05
    # Regex captures the operator (<, >, =, etc.) and the value (.05, 0.042)
    pattern = r'\b[pP]\s*([<>=~]|(?:-value\s*(?:of|is)?\s*[<>=~]?))\s*(\d*\.?\d+)\b'
    matches = re.findall(pattern, text)
    
    for op, val_str in matches:
        try:
            val = float(val_str)
            if 0.0 <= val <= 1.0:
                p_values.append(val)
        except ValueError:
            continue
    return p_values

def analyze_p_distribution(p_values: List[float]) -> Dict[str, Any]:
    """
    Analyze p-value distribution for anomalies.
    - Check if there's a suspicious spike right below 0.05 (classic p-hacking signal).
    - Check if there's a lack of very low p-values.
    """
    total = len(p_values)
    if total < 3:
        return {
            "flagged": False,
            "reason": "Insufficient p-values extracted to run distribution analysis.",
            "metrics": {"total_p_values": total}
        }
        
    significant = [p for p in p_values if p < 0.05]
    just_significant = [p for p in p_values if 0.04 <= p < 0.05] # Clustered right below threshold
    marginal = [p for p in p_values if 0.05 <= p <= 0.06] # Barely missed
    
    sig_ratio = len(significant) / total
    just_sig_ratio = len(just_significant) / max(1, len(significant))
    
    flagged = False
    reasons = []
    
    # Check for excessive clustering between 0.04 and 0.05 (p-hacking)
    if len(significant) >= 4 and just_sig_ratio > 0.6:
        flagged = True
        reasons.append("High proportion of significant p-values are clustered tightly between 0.04 and 0.05, which is a common indicator of publication bias or p-hacking.")
        
    # Check for abnormally high significance rate without low p-values
    very_significant = [p for p in p_values if p < 0.005]
    if len(significant) >= 5 and len(very_significant) == 0:
        flagged = True
        reasons.append("High significance rate (p < 0.05) observed, but with a complete absence of highly significant (p < 0.005) results. This can indicate underpowered studies with inflated effect sizes.")
        
    return {
        "flagged": flagged,
        "reason": "; ".join(reasons) if flagged else "p-value distribution appears normal.",
        "metrics": {
            "total_p_values": total,
            "significant_count": len(significant),
            "just_significant_count": len(just_significant),
            "marginal_count": len(marginal),
            "significance_rate": round(sig_ratio, 3),
            "just_significant_ratio": round(just_sig_ratio, 3)
        }
    }

def detect_sample_sizes(text: str) -> List[int]:
    """
    Extract sample sizes (N=...) from the text.
    Handles N = 45, n=120, sample size of 30, etc.
    """
    sample_sizes = []
    # Match N = 40, n=200, N= 2,000, participants = 40
    patterns = [
        r'\b[nN]\s*=\s*(\d{1,3}(?:,\d{3})*)\b',
        r'\bsample\s*size\s*(?:of|is)?\s*(\d{1,3}(?:,\d{3})*)\b',
        r'\b(\d{1,3}(?:,\d{3})*)\s*(?:participants|subjects|patients|mice|rats)\b'
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text)
        for val_str in matches:
            try:
                # Remove commas
                clean_str = val_str.replace(",", "")
                val = int(clean_str)
                # Filter out numbers that are too small/large to be valid sample sizes or are years
                if 3 <= val <= 1000000 and val != 2020 and val != 2021 and val != 2022 and val != 2023 and val != 2024 and val != 2025 and val != 2026:
                    sample_sizes.append(val)
            except ValueError:
                continue
    return list(set(sample_sizes)) # return unique sizes

def analyze_power(sample_sizes: List[int], p_values: List[float]) -> List[Dict[str, Any]]:
    """
    Detect statistical power flags.
    If sample sizes are low (<30) and findings are significant, flag underpowered study.
    """
    flags = []
    if not sample_sizes:
        return flags
        
    min_n = min(sample_sizes)
    significant_p = [p for p in p_values if p < 0.05]
    
    if min_n < 30 and significant_p:
        flags.append({
            "type": "Underpowered Study",
            "message": f"Small sample size detected (N={min_n}). Studies with N < 30 have low statistical power, making significant results (p < 0.05) prone to high false-positive rates (type I errors) and effect size exaggeration (Winner's Curse).",
            "severity": "Medium" if min_n >= 15 else "High"
        })
    elif min_n < 15:
        flags.append({
            "type": "Very Small Sample Size",
            "message": f"Extremely small sample size detected (N={min_n}). Quantitative findings are descriptive only and lack generalizable statistical inference power.",
            "severity": "High"
        })
        
    return flags

def run_stats_audit(text: str) -> List[Dict[str, Any]]:
    """
    Run complete statistical audit on a paper text.
    """
    p_values = detect_p_values(text)
    sample_sizes = detect_sample_sizes(text)
    
    p_analysis = analyze_p_distribution(p_values)
    power_flags = analyze_power(sample_sizes, p_values)
    
    anomalies = []
    
    if p_analysis["flagged"]:
        anomalies.append({
            "type": "p-Hacking Signal",
            "message": p_analysis["reason"],
            "severity": "High",
            "metrics": p_analysis["metrics"]
        })
        
    for flag in power_flags:
        anomalies.append({
            "type": flag["type"],
            "message": flag["message"],
            "severity": flag["severity"],
            "metrics": {
                "detected_sample_sizes": sample_sizes,
                "p_values_count": len(p_values)
            }
        })
        
    # Check for empty p-values or sample sizes - warn if none detected
    if not p_values and not sample_sizes:
        # Check if it has equations or numerical figures
        if any(word in text.lower() for word in ["equation", "formula", "regression", "model"]):
            anomalies.append({
                "type": "Missing Statistical Transparency",
                "message": "The paper uses mathematical modeling or quantitative discussions but did not report standard p-values or sample sizes (N) in a recognizable format.",
                "severity": "Low",
                "metrics": {}
            })
            
    return anomalies
