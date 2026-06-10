import httpx
import json

backend_url = "http://127.0.0.1:8000"

def test_health():
    print("1. Testing Health Check...")
    try:
        response = httpx.get(f"{backend_url}/api/health")
        print(f"Health Response: {response.status_code} - {response.json()}")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        print("[OK] Health Check Passed!\n")
    except Exception as e:
        print(f"[FAIL] Health Check Failed: {e}\n")

def test_analyze():
    print("2. Testing End-to-End Paper Analysis (LangGraph)...")
    payload = {
        "title": "Sparse Tensor Message Passing on Heterogeneous GNN Architectures 11111",
        "raw_text": "We present a sparse tensor optimization for graph neural networks. Our model reduces message passing latency by 95% while keeping Cora classification accuracy above 92.5%. To evaluate this, we recruited N=12 participants for qualitative feedback. The p-values for key accuracy thresholds were recorded: p=0.041, p=0.043, p=0.044, p=0.042. Competing interests: The authors declare they are employees of GPU Accelerators Corp and hold stock options. Figure 3 plots comparative benchmarks.",
        "doi": "10.1038/nature-new-doi-11111",
        "arxiv_id": "2406.12345"
    }
    try:
        response = httpx.post(
            f"{backend_url}/api/analyze",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30.0
        )
        print(f"Analyze Response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print("Keys returned by API:", list(data.keys()))
        print("\n--- Summary of Extracted Analysis ---")
        print(f"Title: {data['title']}")
        print(f"Claims Extracted: {len(data['claims'])}")
        for i, c in enumerate(data['claims']):
            print(f"  Claim {i+1}: {c['claim'][:80]}... [{c['status']}]")
            
        print(f"\nStatistical Anomalies Detected: {len(data['stats_anomalies'])}")
        for a in data['stats_anomalies']:
            print(f"  [{a['type']}] ({a['severity']}): {a['message']}")
            
        print(f"\nConflict of Interest Disclosure:")
        print(f"  {data['integrity_report']['coi_disclosure']}")
        print(f"  Bias Flag: {data['integrity_report']['coi_bias_detected']}")
        
        print(f"\nGenerated Research Hypotheses: {len(data['hypotheses'])}")
        for h in data['hypotheses']:
            print(f"  * {h['name']}: {h['description'][:100]}...")
            
        print(f"\nConcept Map Coordinates:")
        print(f"  Nodes: {len(data['concept_map_nodes'])} | Links: {len(data['concept_map_links'])}")
        
        print(f"\nComplexity Gauge:")
        print(f"  Score: {data['complexity']['difficulty_score']} | Est. Time: {data['complexity']['estimated_reading_time']} min | Math: {data['complexity']['math_density']}")
        
        print(f"\nReplication Repositories: {len(data['replication_repos'])}")
        for r in data['replication_repos']:
            print(f"  * {r['name']} ({r['primary_language']}) - Docker: {r['has_docker']} | URL: {r['url']}")
            
        print(f"\nRelated Educational Videos: {len(data['related_videos'])}")
        for v in data['related_videos']:
            safe_creator = v['creator'].encode('ascii', 'replace').decode('ascii')
            safe_title = v['title'].encode('ascii', 'replace').decode('ascii')
            print(f"  * {safe_title} by {safe_creator} - URL: {v['url']}")
            assert v['thumbnail'] != ""

        print(f"\nAuthor Impact Network: {len(data.get('author_network', []))}")
        assert "author_network" in data
        for author in data['author_network']:
            safe_name = author['name'].encode('ascii', 'replace').decode('ascii')
            safe_affiliation = author['affiliation'].encode('ascii', 'replace').decode('ascii')
            print(f"  * Author: {safe_name} | Affiliation: {safe_affiliation} | H-Index: {author['h_index']}")
            assert isinstance(author['h_index'], int)
            assert isinstance(author['co_authors'], list)
            assert isinstance(author['top_papers'], list)
            print(f"    Co-authors: {', '.join([c.encode('ascii', 'replace').decode('ascii') for c in author['co_authors']])}")
            for paper in author['top_papers']:
                safe_paper_title = paper['title'].encode('ascii', 'replace').decode('ascii')
                print(f"      - Paper: {safe_paper_title} (Year: {paper['year']}, Citations: {paper['citations']})")
            
        print("\n[OK] End-to-End Analysis Passed!\n")
    except Exception as e:
        print(f"[FAIL] End-to-End Analysis Failed: {e}\n")

if __name__ == "__main__":
    print("=== Episteme Backend Verification Tests ===")
    test_health()
    test_analyze()
