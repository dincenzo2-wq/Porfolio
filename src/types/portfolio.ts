export type ProjectCategory =
  | 'Tất cả'
  | 'TVC'
  | 'Social 9:16'
  | 'Motion'
  | 'Event Recap'
  | (string & {});

export type AspectRatioType = '16:9' | '9:16';

export interface PortfolioProject {
  id: string;
  title: string;
  clientOrAgency?: string;
  category: string;
  aspectRatio: AspectRatioType;
  gridSpan: string; // e.g. "col-span-12 md:col-span-8", "col-span-12 sm:col-span-6 md:col-span-4"
  year: string;
  duration: string;
  deliverableRole: string | string[];
  coverImage: string;
  videoUrl?: string;
  agencyBrief: string;
  turnaroundTime?: string;
  hidden?: boolean;
}

export interface AgencyServiceItem {
  id: string;
  index: string;
  title: string;
  tagline: string;
  description: string;
  deliverables: string[];
}

export interface ExperienceItem {
  id: string;
  period: string;
  role: string;
  companyOrClients: string;
  scope: string;
}

export interface EducationItem {
  id: string;
  period: string;
  degree: string;
  institution: string;
  description: string;
}

export type SoftwareToolId =
  | 'davinci'
  | 'after-effects'
  | 'photoshop'
  | 'illustrator'
  | 'capcut';

export interface SoftwareToolEntry {
  name: string;
  customSvg?: string;
}

export type SoftwareToolType = string | SoftwareToolEntry;

export interface SoftwareToolItem {
  id: SoftwareToolId;
  name: string;
  shortName: string;
  discipline: string;
  brandColor: string;
  bgColor: string;
  borderColor: string;
  customSvg?: string;
}

export interface InquiryFormInput {
  name: string;
  agencyOrBrand: string;
  email: string;
  projectType: string;
  timeline: string;
  brief: string;
}

export interface InquiryFormErrors {
  name?: string;
  agencyOrBrand?: string;
  email?: string;
  projectType?: string;
  timeline?: string;
  brief?: string;
}

export interface StillsItem {
  id: string;
  src: string;
  alt: string;
  title?: string;
  row?: 'top' | 'bottom';
  year?: string;
}

export interface GearSpecSheetData {
  cameraAndLens: string[];
  stabilizer: string[];
  audioAndLight: string[];
}

export type HeroBgType = 'image' | 'video';

export interface SiteProfileData {
  fullName: string;
  shortMark: string;
  roleTitle: string;
  location: string;
  portraitUrl: string;
  positioning: string;
  bioDetail: string;
  email: string;
  phone: string;
  zalo: string;
  telegram: string;
  heroIntro: string;
  projectsSubtitle: string;
  agencySubtitle: string;
  showBrandMarquee?: boolean;
  collaboratorsText?: string;
  brandLogos?: string[];
  footerTitle: string;
  footerDescription: string;
  showreelEnabled?: boolean;
  showreelUrl?: string;
  showreelLabel?: string;
  heroBgUrl?: string;
  heroBgType?: HeroBgType;
  heroPosterUrl?: string; // Instant 0ms poster image frame while video buffers
  heroVideoStart?: number; // In-point in seconds (default: 0)
  heroVideoEnd?: number;   // Out-point in seconds (default: 15)
}

export interface SiteBrandingData {
  logoSvg?: string;
  logoDataUrl?: string;
  brandName: string;
  showBrandName: boolean;
  logoHeight: number; // 20 - 32 (px)
  autoRemoveWhiteBg: boolean;
  invertNavbarColor: boolean;
  faviconDarkSquare: boolean;
  faviconPadding: number; // 8 - 30 (%)
  faviconTheme?: 'dark' | 'light'; // 'dark': nền #111111 + icon #F7F6F2; 'light': nền #F7F6F2 + icon #111111
}

export interface PortfolioContentPayload {
  profile: SiteProfileData;
  branding?: SiteBrandingData;
  projects: PortfolioProject[];
  categories?: string[];
  categorySubtitles?: Record<string, string>;
  roles?: string[];
  stills: StillsItem[];
  gear: GearSpecSheetData;
  services: AgencyServiceItem[];
  experience: ExperienceItem[];
  education: EducationItem[];
  tools?: SoftwareToolType[];
  updatedAt?: string;
}
