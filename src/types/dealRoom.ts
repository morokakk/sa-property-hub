import type { DevelopmentProject } from '@/types';

export interface PublicDealRoomSponsor {
  entityName: string;
  registrationNumber?: string;
}

export interface PublicDealRoomPayload {
  development: DevelopmentProject;
  sponsor: PublicDealRoomSponsor;
  isDemo: boolean;
}
