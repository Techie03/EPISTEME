from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# Define the individual claim schema
class Claim(BaseModel):
    claim: str = Field(description="The extracted factual statement from the paper.")
    context: str = Field(description="Surrounding text or paragraph context.")
    category: str = Field(description="Type of claim: Result, Methodology, Hypothesis, Background.")
    stats_referenced: Optional[str] = Field(None, description="Any specific statistical values, p-values, or dataset metrics referenced.")
    status: str = Field("Unverified", description="Verification status: Verified, Unverified, Contradicted.")
    explanation: Optional[str] = Field(None, description="Detailed reasoning for the verification status.")
    evidence_sources: List[Dict[str, Any]] = Field(default=[], description="List of source papers or articles serving as evidence.")

# Define integrity structures
class ChartFlag(BaseModel):
    figure: str = Field(description="Figure/table name (e.g. Figure 3).")
    issue: str = Field(description="Description of the visual or data presentation issue.")
    severity: str = Field("Medium", description="Low, Medium, High.")

class BiasMeter(BaseModel):
    sponsor_category: str = Field("Independent", description="Corporate, Government, Independent, or Mixed.")
    bias_rating: str = Field("Low", description="Low, Medium, or High.")
    explanation: str = Field("", description="Reasoning for the bias rating.")
    corporate_influence_ratio: float = Field(0.0, description="Estimated commercial/corporate influence ratio from 0.0 to 1.0.")

class MethodologyFlag(BaseModel):
    issue: str = Field(..., description="Pitfall or red flag issue name.")
    risk_level: str = Field("Medium", description="Low, Medium, or High.")
    explanation: str = Field(..., description="Reasoning or details of the issue.")
    remedy: str = Field(..., description="Proposed corrective replication step.")

class IntegrityReport(BaseModel):
    retracted: bool = Field(default=False, description="Whether this paper is marked retracted in Retraction Watch.")
    retraction_details: Optional[str] = Field(None, description="Details of retraction, if retracted.")
    retracted_citations_count: int = Field(default=0, description="Number of papers cited by this paper that have been retracted.")
    retracted_citations_list: List[Dict[str, Any]] = Field(default=[], description="List of cited retracted papers.")
    coi_disclosure: Optional[str] = Field(None, description="Conflict of interest summary.")
    coi_bias_detected: bool = Field(default=False, description="Flag indicating potential institutional or financial bias.")
    data_availability: str = Field("Not disclosed", description="Code/data availability statements found.")
    chart_flags: List[ChartFlag] = Field(default=[], description="Visual chart or graphical discrepancy issues.")
    bias_meter: Optional[BiasMeter] = None
    methodology_flags: List[MethodologyFlag] = Field(default=[], description="Methodology pitfalls or experimental design flags.")

# Define similar paper schema
class SimilarPaper(BaseModel):
    title: str
    authors: List[str]
    year: Optional[int] = None
    doi: Optional[str] = None
    citation_count: int = 0
    url: Optional[str] = None
    similarity_score: float = 0.0
    abstract: Optional[str] = None

class PeerReviewReport(BaseModel):
    strengths: List[str] = Field(default=[], description="Strengths of the paper.")
    weaknesses: List[str] = Field(default=[], description="Weaknesses or critical flaws of the paper.")
    questions_for_authors: List[str] = Field(default=[], description="Revision or defense questions for authors.")
    recommendation: str = Field("Accept with minor revisions", description="Recommendation rating.")

class TimelineEvent(BaseModel):
    year: int = Field(..., description="Publication year of the historical event.")
    title: str = Field(..., description="Paper or discovery title.")
    authors: List[str] = Field(default=[], description="List of authors.")
    relationship: str = Field(..., description="Relationship: Ancestor Foundation | Descendant Successor | Current Paper")
    claim_mutation: str = Field(..., description="Brief summary of how the scientific claim evolved or changed in this node.")

class ReplicationRepo(BaseModel):
    name: str = Field(..., description="GitHub repository name.")
    url: str = Field(..., description="GitHub URL.")
    stars: int = Field(default=0, description="GitHub repository stars count.")
    forks: int = Field(default=0, description="GitHub repository forks count.")
    has_docker: bool = Field(default=False, description="Whether a Dockerfile or docker-compose is detected.")
    primary_language: str = Field("Python", description="Primary programming language.")

class ComplexityReport(BaseModel):
    difficulty_score: int = Field(50, description="Complexity/Difficulty score from 0 to 100.")
    estimated_reading_time: int = Field(15, description="Estimated reading time in minutes.")
    prerequisites: List[str] = Field(default=[], description="Background knowledge concepts needed.")
    math_density: str = Field("Low", description="Mathematical notation density: Low, Medium, High.")

class RelatedVideo(BaseModel):
    title: str = Field(..., description="Video title.")
    url: str = Field(..., description="YouTube URL.")
    creator: str = Field(..., description="Channel or creator name.")
    duration: str = Field("10:00", description="Video duration.")
    thumbnail: str = Field("", description="Thumbnail image URL.")

class AuthorProfile(BaseModel):
    name: str = Field(..., description="Author name.")
    affiliation: str = Field("Unknown Institution", description="Primary academic affiliation.")
    h_index: int = Field(0, description="H-index calculation.")
    co_authors: List[str] = Field(default=[], description="List of frequent co-authors.")
    top_papers: List[Dict[str, Any]] = Field(default=[], description="Top cited publication list with title, year, citations.")

# Define the overall compiled analysis response
class PaperAnalysisResponse(BaseModel):
    doi: Optional[str] = None
    arxiv_id: Optional[str] = None
    title: str
    claims: List[Claim] = []
    integrity_report: Optional[IntegrityReport] = None
    research_gaps: List[str] = []
    hypotheses: List[Dict[str, str]] = []  # Name, description, method
    benchmarks: List[Dict[str, Any]] = []  # Leaderboard tasks, values, code url
    similar_papers: List[SimilarPaper] = []
    stats_anomalies: List[Dict[str, Any]] = []
    concept_map_nodes: List[Dict[str, Any]] = []
    concept_map_links: List[Dict[str, Any]] = []
    peer_review: Optional[PeerReviewReport] = None
    evolution_timeline: List[TimelineEvent] = []
    replication_repos: List[ReplicationRepo] = []
    complexity: Optional[ComplexityReport] = None
    related_videos: List[RelatedVideo] = []
    author_network: List[AuthorProfile] = []

# State schema used by LangGraph
class GraphState(BaseModel):
    doi: Optional[str] = None
    arxiv_id: Optional[str] = None
    title: str
    raw_text: str
    claims: List[Dict[str, Any]] = []
    similar_papers: List[Dict[str, Any]] = []
    integrity_report: Optional[Dict[str, Any]] = None
    research_gaps: List[str] = []
    hypotheses: List[Dict[str, Any]] = []
    benchmarks: List[Dict[str, Any]] = []
    stats_anomalies: List[Dict[str, Any]] = []
    concept_map_nodes: List[Dict[str, Any]] = []
    concept_map_links: List[Dict[str, Any]] = []
    peer_review: Optional[Dict[str, Any]] = None
    evolution_timeline: List[Dict[str, Any]] = []
    replication_repos: List[Dict[str, Any]] = []
    complexity: Optional[Dict[str, Any]] = None
    related_videos: List[Dict[str, Any]] = []
    author_network: List[Dict[str, Any]] = []
