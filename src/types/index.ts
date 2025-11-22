export type PipelineStatus =
    | 'new'
    | 'review'
    | 'preselected'
    | 'interview_scheduled'
    | 'interviewing'
    | 'approved'
    | 'rejected'
    | 'offer_sent'
    | 'hired'
    | 'declined'
    | 'archived';

export interface EvaluationCriteria {
    name: string;
    desc: string;
}

export interface AnalysisResult {
    relevance: number;
    education: number;
    previousJobs: number;
    proactivity: number;
    analysis: {
        relevance: string;
        education: string;
        previousJobs: string;
        proactivity: string;
    };
    strengths?: string[];
    weaknesses?: string[];
    criticalAnalysis?: string;
}

export interface Note {
    id: string;
    content: string;
    date: string;
}

export interface ContactInfo {
    name: string | null;
    email: string | null;
    phone: string | null;
}

export interface Candidate {
    id: string;
    searchId: number;
    fileName: string;
    cvText: string;
    pdfUrl?: string; // Object URL for preview
    pdfDataUrl?: string; // Base64 for persistence
    name: string | null;
    email: string | null;
    phone: string | null;
    relevance: number;
    education: number;
    previousJobs: number;
    proactivity: number;
    analysis: {
        relevance: string;
        education: string;
        previousJobs: string;
        proactivity: string;
    };
    totalScore: number;
    status: PipelineStatus;
    notes?: Note[]; // Changed from string to Note[]
    isFavorite?: boolean; // New feature
    interviewDate?: string; // New feature
    strengths?: string[]; // New feature
    weaknesses?: string[]; // New feature
    criticalAnalysis?: string; // New feature
    tags?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Search {
    id?: number; // Auto-incremented by IDB
    name: string;
    jobDescription: string;
    personalizedInstructions: string;
    evaluationCriteria: Record<string, EvaluationCriteria>;
    status: 'active' | 'archived';
    createdAt: string;
    updatedAt: string;
}

export interface AppSettings {
    apiKey: string;
    selectedModel: string;
    theme: 'light' | 'dark';
    defaultEvaluationCriteria?: Record<string, EvaluationCriteria>;
    criteriaPresets?: Record<string, Record<string, EvaluationCriteria>>;
}
