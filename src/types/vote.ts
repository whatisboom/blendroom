/**
 * Voting types for skip votes and track likes
 */

export type VoteType = 'skip' | 'like';

export interface Vote {
  userId: string;
  type: VoteType;
  trackId: string;
  timestamp: number;
}

export interface SkipVote {
  userId: string;
  timestamp: number;
}

export interface LikeVote {
  userId: string;
  trackId: string;
  timestamp: number;
}

export interface VoteState {
  skip: SkipVote[];
  like: LikeVote[];
}
