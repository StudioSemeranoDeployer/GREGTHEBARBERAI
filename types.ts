
export interface HairstyleRecommendation {
  id: string;
  name: string;
  description: string;
  whyItWorks: string;
  trendLevel: 'Classic' | 'Trending' | 'Bold';
}

export interface AnalysisResult {
  faceShape: string;
  hairTexture: string;
  recommendations: HairstyleRecommendation[];
}

export interface GeneratedStyle {
  style: HairstyleRecommendation;
  imageUrl: string;
}

export enum AppStep {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  GENERATING = 'GENERATING',
  RESULT = 'RESULT'
}
