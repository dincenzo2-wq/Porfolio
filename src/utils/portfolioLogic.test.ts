import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractUniqueBrands,
  filterProjects,
  formatDeliverableRoles,
  getAdjacentProject,
  isAgencyOrProduction,
  isPillActive,
  parseDeliverableRoles,
  shouldShowFloatingNavbar,
  suggestAspectRatioForCategory,
  toggleClientOrAgency,
  validateInquiryForm,
  normalizeCategoryKey,
  getCategoryMeta,
  capitalizeWords,
} from './portfolioLogic';
import {
  formatVideoDuration,
  normalizeDropboxUrl,
  parseVideoUrl,
  detectAspectRatioFromVideoUrl,
} from './videoEmbed';
import type { PortfolioProject } from '../types/portfolio';

const SAMPLE_PROJECTS: PortfolioProject[] = [
  {
    id: 'p1',
    title: 'Pepsi Summer',
    clientOrAgency: 'Dentsu / Pepsi',
    category: 'TVC',
    aspectRatio: '16:9',
    gridSpan: 'col-span-12 md:col-span-8',
    year: '2025',
    duration: '00:45',
    deliverableRole: 'DOP & Editor',
    coverImage: '/img1.jpg',
    agencyBrief: 'TVC',
  },
  {
    id: 'p2',
    title: 'VinFast VF7',
    clientOrAgency: 'Havas / VinFast',
    category: 'Social 9:16',
    aspectRatio: '9:16',
    gridSpan: 'col-span-12 md:col-span-4',
    year: '2025',
    duration: '00:30',
    deliverableRole: 'Editor 9:16',
    coverImage: '/img2.jpg',
    agencyBrief: 'Social 9:16',
  },
  {
    id: 'p3',
    title: 'Techfest Motion',
    clientOrAgency: 'VNG Games',
    category: 'Motion',
    aspectRatio: '16:9',
    gridSpan: 'col-span-12 md:col-span-6',
    year: '2024',
    duration: '00:40',
    deliverableRole: 'Motion Designer',
    coverImage: '/img3.jpg',
    agencyBrief: 'Motion Graphics',
  },
];

test('filterProjects returns all when category is Tất cả', () => {
  const result = filterProjects(SAMPLE_PROJECTS, 'Tất cả');
  assert.equal(result.length, 3);
});

test('filterProjects correctly filters specific category', () => {
  const tvc = filterProjects(SAMPLE_PROJECTS, 'TVC');
  assert.equal(tvc.length, 1);
  assert.equal(tvc[0].id, 'p1');

  const social = filterProjects(SAMPLE_PROJECTS, 'Social 9:16');
  assert.equal(social.length, 1);
  assert.equal(social[0].id, 'p2');
});

test('getAdjacentProject loops forward and backward', () => {
  const next = getAdjacentProject(SAMPLE_PROJECTS, 'p1', 'next');
  assert.equal(next?.id, 'p2');

  const prev = getAdjacentProject(SAMPLE_PROJECTS, 'p1', 'prev');
  assert.equal(prev?.id, 'p3');
});

test('validateInquiryForm checks required fields', () => {
  const errors = validateInquiryForm({
    name: '',
    agencyOrBrand: '',
    email: 'invalid-email',
    projectType: 'TVC',
    timeline: 'Tuần này',
    brief: 'short',
  });

  assert.ok(errors.name);
  assert.ok(errors.email);
  assert.ok(errors.brief);

  const valid = validateInquiryForm({
    name: 'Minh Anh',
    agencyOrBrand: 'Ogilvy Vietnam',
    email: 'minhanh@ogilvy.com',
    projectType: 'TVC',
    timeline: 'Tháng tới',
    brief: 'Cần quay và dựng TVC 30s cho chiến dịch hè.',
  });

  assert.equal(Object.keys(valid).length, 0);
});

test('shouldShowFloatingNavbar detects scroll threshold', () => {
  assert.equal(shouldShowFloatingNavbar(20, 60), false);
  assert.equal(shouldShowFloatingNavbar(80, 60), true);
});

test('formatVideoDuration formats seconds to MM:SS or HH:MM:SS', () => {
  assert.equal(formatVideoDuration(0), '00:00');
  assert.equal(formatVideoDuration(10), '00:10');
  assert.equal(formatVideoDuration(10.4), '00:10');
  assert.equal(formatVideoDuration(45), '00:45');
  assert.equal(formatVideoDuration(75), '01:15');
  assert.equal(formatVideoDuration(3665), '01:01:05');
  assert.equal(formatVideoDuration(NaN), '00:00');
  assert.equal(formatVideoDuration(-10), '00:00');
  assert.equal(formatVideoDuration(Infinity), '00:00');
});

test('normalizeDropboxUrl converts to dl.dropboxusercontent.com and preserves query params', () => {
  const linkWithDl0 = 'https://www.dropbox.com/scl/fi/xyz123/video.mp4?rlkey=abc456&dl=0';
  assert.equal(
    normalizeDropboxUrl(linkWithDl0),
    'https://dl.dropboxusercontent.com/scl/fi/xyz123/video.mp4?rlkey=abc456'
  );

  const linkWithDl1 = 'https://www.dropbox.com/scl/fi/xyz123/video.mp4?rlkey=abc456&dl=1';
  assert.equal(
    normalizeDropboxUrl(linkWithDl1),
    'https://dl.dropboxusercontent.com/scl/fi/xyz123/video.mp4?rlkey=abc456'
  );

  const linkNoParams = 'https://www.dropbox.com/s/abc123xyz/video.mp4';
  assert.equal(
    normalizeDropboxUrl(linkNoParams),
    'https://dl.dropboxusercontent.com/s/abc123xyz/video.mp4'
  );

  // Non-dropbox URLs remain unchanged
  assert.equal(normalizeDropboxUrl('/videos/dem-khong-ngu.mp4'), '/videos/dem-khong-ngu.mp4');
  assert.equal(
    normalizeDropboxUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  );
});

test('parseVideoUrl recognizes Dropbox as direct MP4 stream', () => {
  const dropboxLink = 'https://www.dropbox.com/scl/fi/xyz123/video.mp4?rlkey=abc456&dl=0';
  const parsed = parseVideoUrl(dropboxLink);

  assert.equal(parsed.type, 'direct');
  assert.equal(parsed.isDropbox, true);
  assert.equal(parsed.platformName, 'Dropbox MP4');
  assert.equal(
    parsed.directUrl,
    'https://dl.dropboxusercontent.com/scl/fi/xyz123/video.mp4?rlkey=abc456'
  );
});

test('parseDeliverableRoles converts string or array safely into pills array', () => {
  // Array input
  assert.deepEqual(parseDeliverableRoles(['Quay phim', 'Dựng phim']), ['Quay phim', 'Dựng phim']);
  assert.deepEqual(parseDeliverableRoles(['  Quay phim  ', '']), ['Quay phim']);

  // String with ' · ' delimiter
  assert.deepEqual(parseDeliverableRoles('Quay phim · Dựng phim · Color Grading'), [
    'Quay phim',
    'Dựng phim',
    'Color Grading',
  ]);

  // Legacy single string
  assert.deepEqual(parseDeliverableRoles('Đạo diễn hình ảnh & Dựng Color Grading'), [
    'Đạo diễn hình ảnh & Dựng Color Grading',
  ]);

  // Null, undefined, empty
  assert.deepEqual(parseDeliverableRoles(''), []);
  assert.deepEqual(parseDeliverableRoles('   '), []);
  assert.deepEqual(parseDeliverableRoles(undefined), []);
  assert.deepEqual(parseDeliverableRoles(null), []);
});

test('formatDeliverableRoles joins array with dot delimiter and handles strings', () => {
  // Array
  assert.equal(formatDeliverableRoles(['Quay phim', 'Dựng phim']), 'Quay phim · Dựng phim');
  assert.equal(
    formatDeliverableRoles(['Quay phim', 'Dựng phim', 'Color Grading']),
    'Quay phim · Dựng phim · Color Grading'
  );

  // String
  assert.equal(formatDeliverableRoles('Quay phim · Dựng phim'), 'Quay phim · Dựng phim');
  assert.equal(
    formatDeliverableRoles('Đạo diễn hình ảnh & Dựng Color Grading'),
    'Đạo diễn hình ảnh & Dựng Color Grading'
  );

  // Empty/Undefined
  assert.equal(formatDeliverableRoles([]), '');
  assert.equal(formatDeliverableRoles(undefined), '');
  assert.equal(formatDeliverableRoles(null), '');
});

test('extractUniqueBrands extracts de-duplicated brands and handles customText', () => {
  const testProjects: PortfolioProject[] = [
    {
      id: 'p1',
      title: 'Project 1',
      clientOrAgency: 'Dentsu Redder · PepsiCo Vietnam',
      category: 'TVC',
      aspectRatio: '16:9',
      gridSpan: 'col-span-12',
      year: '2025',
      duration: '00:30',
      deliverableRole: 'Editor',
      coverImage: '',
      agencyBrief: '',
    },
    {
      id: 'p2',
      title: 'Project 2',
      clientOrAgency: 'Havas Vietnam · VinFast',
      category: 'TVC',
      aspectRatio: '16:9',
      gridSpan: 'col-span-12',
      year: '2025',
      duration: '00:30',
      deliverableRole: 'DOP',
      coverImage: '',
      agencyBrief: '',
    },
    {
      id: 'p3',
      title: 'Project 3',
      clientOrAgency: 'Dentsu Redder · VinFast', // duplicates Dentsu and VinFast
      category: 'Social 9:16',
      aspectRatio: '9:16',
      gridSpan: 'col-span-12',
      year: '2025',
      duration: '00:30',
      deliverableRole: 'Editor',
      coverImage: '',
      agencyBrief: '',
    },
    {
      id: 'p4',
      title: 'Project 4 (Hidden)',
      clientOrAgency: 'Hidden Client',
      hidden: true,
      category: 'TVC',
      aspectRatio: '16:9',
      gridSpan: 'col-span-12',
      year: '2025',
      duration: '00:30',
      deliverableRole: 'Editor',
      coverImage: '',
      agencyBrief: '',
    },
    {
      id: 'p5',
      title: 'Project 5 (No client)',
      clientOrAgency: '',
      category: 'TVC',
      aspectRatio: '16:9',
      gridSpan: 'col-span-12',
      year: '2025',
      duration: '00:30',
      deliverableRole: 'Editor',
      coverImage: '',
      agencyBrief: '',
    },
  ];

  const extracted = extractUniqueBrands(testProjects);
  assert.deepEqual(extracted, ['Dentsu Redder', 'PepsiCo Vietnam', 'Havas Vietnam', 'VinFast']);

  // Custom text override
  const custom = extractUniqueBrands(testProjects, 'Apple · Google · Netflix');
  assert.deepEqual(custom, ['Apple', 'Google', 'Netflix']);

  // Filters out generic descriptions such as "Thương hiệu Thủ công Mỹ nghệ", "Tourism Campaign", "Fashion House"
  const genericProjects: PortfolioProject[] = [
    {
      id: 'g1',
      title: 'Glass Art',
      clientOrAgency: 'Studio 09 · Thương hiệu Thủ công Mỹ nghệ',
      category: 'TVC',
      aspectRatio: '16:9',
      gridSpan: 'col-span-12',
      year: '2025',
      duration: '01:00',
      deliverableRole: 'Editor',
      coverImage: '',
      agencyBrief: '',
    },
    {
      id: 'g2',
      title: 'Highland Mist',
      clientOrAgency: 'T&A Ogilvy · Tourism Campaign',
      category: 'TVC',
      aspectRatio: '16:9',
      gridSpan: 'col-span-12',
      year: '2024',
      duration: '01:30',
      deliverableRole: 'Editor',
      coverImage: '',
      agencyBrief: '',
    },
    {
      id: 'g3',
      title: 'Fashion Reel',
      clientOrAgency: "L'OFFICIEL Vietnam · Fashion House",
      category: 'Social 9:16',
      aspectRatio: '9:16',
      gridSpan: 'col-span-12',
      year: '2024',
      duration: '00:30',
      deliverableRole: 'Editor',
      coverImage: '',
      agencyBrief: '',
    },
  ];

  const filteredBrands = extractUniqueBrands(genericProjects);
  assert.deepEqual(filteredBrands, ['Studio 09', 'T&A Ogilvy', "L'OFFICIEL Vietnam"]);

  // Filters out Wedding and independent clients from commercial Brand Marquee
  const weddingAndCommercialProjects: PortfolioProject[] = [
    {
      id: 'w1',
      title: 'Tuấn & Linh Wedding Story',
      clientOrAgency: 'Wedding · Cặp đôi',
      category: 'Wedding',
      aspectRatio: '16:9',
      gridSpan: 'col-span-12',
      year: '2025',
      duration: '04:15',
      deliverableRole: 'Videographer',
      coverImage: '',
      agencyBrief: '',
    },
    {
      id: 'w2',
      title: 'Đám Cưới Phương & Duy',
      clientOrAgency: 'Khách lẻ / Cá nhân',
      category: 'Wedding',
      aspectRatio: '16:9',
      gridSpan: 'col-span-12',
      year: '2025',
      duration: '03:40',
      deliverableRole: 'Editor',
      coverImage: '',
      agencyBrief: '',
    },
    {
      id: 'c1',
      title: 'Pepsi Refresh',
      clientOrAgency: 'PepsiCo Vietnam',
      category: 'TVC',
      aspectRatio: '16:9',
      gridSpan: 'col-span-12',
      year: '2025',
      duration: '00:30',
      deliverableRole: 'Editor',
      coverImage: '',
      agencyBrief: '',
    },
  ];

  const extractedCommercialOnly = extractUniqueBrands(weddingAndCommercialProjects);
  assert.deepEqual(extractedCommercialOnly, ['PepsiCo Vietnam']);
});

test('isAgencyOrProduction correctly distinguishes agencies from brands', () => {
  // Agencies / Production houses
  assert.equal(isAgencyOrProduction('Dentsu Redder'), true);
  assert.equal(isAgencyOrProduction('Havas Vietnam'), true);
  assert.equal(isAgencyOrProduction('Ogilvy Vietnam'), true);
  assert.equal(isAgencyOrProduction('T&A Ogilvy'), true);
  assert.equal(isAgencyOrProduction('Studio 09'), true);
  assert.equal(isAgencyOrProduction('Vibe Nation'), true);
  assert.equal(isAgencyOrProduction('ABC Production'), true);
  assert.equal(isAgencyOrProduction('XYZ Media'), true);
  assert.equal(isAgencyOrProduction('Creative Agency'), true);

  // Brands / Direct clients
  assert.equal(isAgencyOrProduction('PepsiCo Vietnam'), false);
  assert.equal(isAgencyOrProduction('VinFast'), false);
  assert.equal(isAgencyOrProduction('Heineken Silver'), false);
  assert.equal(isAgencyOrProduction('Tiger Beer Vietnam'), false);
  assert.equal(isAgencyOrProduction('VNG Games'), false);
  assert.equal(isAgencyOrProduction('Tech In Asia'), false);
  assert.equal(isAgencyOrProduction("L'OFFICIEL Vietnam"), false);
});

test('parseVideoUrl supports YouTube, Vimeo, and MP4 showreel formats', () => {
  // YouTube link
  const yt = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(yt.type, 'youtube');
  assert.equal(yt.videoId, 'dQw4w9WgXcQ');
  assert.ok(yt.embedUrl?.includes('youtube-nocookie.com/embed/dQw4w9WgXcQ'));

  // Vimeo link
  const vimeo = parseVideoUrl('https://vimeo.com/76979871');
  assert.equal(vimeo.type, 'vimeo');
  assert.equal(vimeo.videoId, '76979871');
  assert.ok(vimeo.embedUrl?.includes('player.vimeo.com/video/76979871'));

  // Direct MP4 link
  const mp4 = parseVideoUrl('/videos/dem-khong-ngu.mp4');
  assert.equal(mp4.type, 'direct');
  assert.equal(mp4.directUrl, '/videos/dem-khong-ngu.mp4');

  // VK Video standard link
  const vkStandard = parseVideoUrl('https://vk.com/video-220754053_456239589');
  assert.equal(vkStandard.type, 'vk');
  assert.equal(vkStandard.videoId, '-220754053_456239589');
  assert.ok(vkStandard.embedUrl?.includes('vk.com/video_ext.php?oid=-220754053&id=456239589'));

  // VK Video standalone domain (vkvideo.ru)
  const vkRu = parseVideoUrl('https://vkvideo.ru/video-220754053_456239589');
  assert.equal(vkRu.type, 'vk');
  assert.equal(vkRu.videoId, '-220754053_456239589');

  // VK Clip (short-form 9:16)
  const vkClip = parseVideoUrl('https://vk.com/clip-220754053_456239589');
  assert.equal(vkClip.type, 'vk');
  assert.equal(vkClip.isShorts, true);
  assert.equal(vkClip.platformName, 'VK Clip');

  // VK Embed with hash
  const vkEmbed = parseVideoUrl('https://vk.com/video_ext.php?oid=-220754053&id=456239589&hash=abc123xyz');
  assert.equal(vkEmbed.type, 'vk');
  assert.ok(vkEmbed.embedUrl?.includes('hash=abc123xyz'));

  // VK iframe embed snippet
  const vkIframe = parseVideoUrl('<iframe src="https://vk.com/video_ext.php?oid=-220754053&id=456239589&hash=xyz789" width="800"></iframe>');
  assert.equal(vkIframe.type, 'vk');
  assert.ok(vkIframe.embedUrl?.includes('hash=xyz789'));
});

test('parseVideoUrl supports trimming options (startSec, endSec, loop) for 15s loop', () => {
  // YouTube with 15s window (start 5s, end 20s)
  const ytTrimmed = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
    startSec: 5,
    endSec: 20,
    loop: true,
  });
  assert.equal(ytTrimmed.type, 'youtube');
  assert.equal(ytTrimmed.startSec, 5);
  assert.equal(ytTrimmed.endSec, 20);
  assert.ok(ytTrimmed.embedUrl?.includes('&start=5'));
  assert.ok(ytTrimmed.embedUrl?.includes('&end=20'));
  assert.ok(ytTrimmed.embedUrl?.includes('&loop=1&playlist=dQw4w9WgXcQ'));

  // Vimeo with startSec
  const vimeoTrimmed = parseVideoUrl('https://vimeo.com/76979871', {
    startSec: 10,
    endSec: 25,
    loop: true,
  });
  assert.equal(vimeoTrimmed.type, 'vimeo');
  assert.equal(vimeoTrimmed.startSec, 10);
  assert.equal(vimeoTrimmed.endSec, 25);
  assert.ok(vimeoTrimmed.embedUrl?.includes('#t=10s'));
  assert.ok(vimeoTrimmed.embedUrl?.includes('&loop=1'));

  // Dropbox direct link with 15s window
  const dropboxTrimmed = parseVideoUrl(
    'https://www.dropbox.com/scl/fi/xyz123/video.mp4?rlkey=abc456&dl=0',
    {
      startSec: 0,
      endSec: 15,
      loop: true,
    }
  );
  assert.equal(dropboxTrimmed.type, 'direct');
  assert.equal(dropboxTrimmed.isDropbox, true);
  assert.equal(dropboxTrimmed.startSec, 0);
  assert.equal(dropboxTrimmed.endSec, 15);
  assert.ok(dropboxTrimmed.directUrl?.includes('dl.dropboxusercontent.com'));
});

test('suggestAspectRatioForCategory returns 9:16 for vertical categories and 16:9 for others', () => {
  assert.equal(suggestAspectRatioForCategory('Social 9:16'), '9:16');
  assert.equal(suggestAspectRatioForCategory('TikTok Trends'), '9:16');
  assert.equal(suggestAspectRatioForCategory('Instagram Reels (Dọc)'), '9:16');
  assert.equal(suggestAspectRatioForCategory('TVC'), '16:9');
  assert.equal(suggestAspectRatioForCategory('Event Recap'), '16:9');
  assert.equal(suggestAspectRatioForCategory('Motion'), '16:9');
  assert.equal(suggestAspectRatioForCategory('Wedding / Highlight'), '16:9');
  assert.equal(suggestAspectRatioForCategory('Documentary Film'), '16:9');
});

test('detectAspectRatioFromVideoUrl detects 9:16 for Shorts, TikTok, and Reels, and 16:9 for standard URLs', () => {
  // YouTube Shorts
  assert.equal(detectAspectRatioFromVideoUrl('https://www.youtube.com/shorts/5x-j_fXW7qU'), '9:16');
  assert.equal(detectAspectRatioFromVideoUrl('https://youtube.com/shorts/abcdef12345?feature=share'), '9:16');

  // TikTok
  assert.equal(detectAspectRatioFromVideoUrl('https://www.tiktok.com/@vinhfilm/video/71234567890'), '9:16');

  // Instagram Reels
  assert.equal(detectAspectRatioFromVideoUrl('https://www.instagram.com/reel/C8xyz123/'), '9:16');
  assert.equal(detectAspectRatioFromVideoUrl('https://instagram.com/reels/C8xyz123'), '9:16');

  // Standard 16:9 YouTube & Vimeo & VK Video
  assert.equal(detectAspectRatioFromVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), '16:9');
  assert.equal(detectAspectRatioFromVideoUrl('https://youtu.be/dQw4w9WgXcQ'), '16:9');
  assert.equal(detectAspectRatioFromVideoUrl('https://vimeo.com/12345678'), '16:9');
  assert.equal(detectAspectRatioFromVideoUrl('https://vk.com/video-220754053_456239589'), '16:9');
  assert.equal(detectAspectRatioFromVideoUrl('https://vkvideo.ru/video-220754053_456239589'), '16:9');

  // VK Clip (9:16)
  assert.equal(detectAspectRatioFromVideoUrl('https://vk.com/clip-220754053_456239589'), '9:16');
  assert.equal(detectAspectRatioFromVideoUrl('https://vkvideo.ru/clip-220754053_456239589'), '9:16');

  // Direct MP4 without metadata returns null (to let loadedmetadata inspect real pixel dimensions)
  assert.equal(detectAspectRatioFromVideoUrl('https://pub-r2.dev/video.mp4'), null);
  assert.equal(detectAspectRatioFromVideoUrl(''), null);
  assert.equal(detectAspectRatioFromVideoUrl(undefined), null);
});

test('isPillActive detects active pills and empty state', () => {
  // Empty text -> "Không hiển thị tên khách" or "Không hiển thị Brand (Khách lẻ / Đám cưới)" is active
  assert.equal(isPillActive('', 'Không hiển thị tên khách'), true);
  assert.equal(isPillActive('', 'Không hiển thị Brand (Khách lẻ / Đám cưới)'), true);
  assert.equal(isPillActive('   ', 'Không hiển thị Brand (Khách lẻ / Đám cưới)'), true);
  assert.equal(isPillActive(null, 'Không hiển thị Brand (Khách lẻ / Đám cưới)'), true);
  assert.equal(isPillActive('', 'Khách lẻ / Cá nhân'), false);

  // Single brand
  assert.equal(isPillActive('Dentsu Redder', 'Dentsu Redder'), true);
  assert.equal(isPillActive('Dentsu Redder', 'PepsiCo'), false);

  // Combined Agency + Brand
  assert.equal(isPillActive('Dentsu Redder · PepsiCo Vietnam', 'Dentsu Redder'), true);
  assert.equal(isPillActive('Dentsu Redder · PepsiCo Vietnam', 'PepsiCo Vietnam'), true);
  assert.equal(isPillActive('Dentsu Redder · PepsiCo Vietnam', 'Không hiển thị tên khách'), false);
  assert.equal(isPillActive('Dentsu Redder · PepsiCo Vietnam', 'Không hiển thị Brand (Khách lẻ / Đám cưới)'), false);

  // Khách lẻ with custom bride/groom names
  assert.equal(isPillActive('Khách lẻ / Cá nhân · Thanh Thúy & Minh Khang', 'Khách lẻ / Cá nhân'), true);
  assert.equal(isPillActive('Wedding · Cặp đôi · Thanh Thúy & Minh Khang', 'Wedding · Cặp đôi'), true);
});

test('toggleClientOrAgency handles intelligent combination and toggling', () => {
  // 1. Initial selection
  assert.equal(toggleClientOrAgency('', 'Dentsu Redder'), 'Dentsu Redder');

  // 2. Combining Agency + Brand
  const combined = toggleClientOrAgency('Dentsu Redder', 'PepsiCo');
  assert.equal(combined, 'Dentsu Redder · PepsiCo');

  // 3. Toggling off a brand
  const toggledOff = toggleClientOrAgency('Dentsu Redder · PepsiCo', 'Dentsu Redder');
  assert.equal(toggledOff, 'PepsiCo');

  // 4. Clicking "Không hiển thị tên khách" or "Không hiển thị Brand..." clears everything
  assert.equal(toggleClientOrAgency('Dentsu Redder · PepsiCo', 'Không hiển thị tên khách'), '');
  assert.equal(toggleClientOrAgency('Dentsu Redder · PepsiCo', 'Không hiển thị Brand (Khách lẻ / Đám cưới)'), '');

  // 5. Khách lẻ preset with custom text replacement
  const initialWedding = toggleClientOrAgency('', 'Wedding · Cặp đôi');
  assert.equal(initialWedding, 'Wedding · Cặp đôi');

  // User appends name: "Wedding · Cặp đôi · Thanh Thúy & Minh Khang"
  const customWedding = 'Wedding · Cặp đôi · Thanh Thúy & Minh Khang';
  // User switches preset to "Khách lẻ / Cá nhân":
  const switchedPreset = toggleClientOrAgency(customWedding, 'Khách lẻ / Cá nhân');
  assert.equal(switchedPreset, 'Khách lẻ / Cá nhân · Thanh Thúy & Minh Khang');

  // Toggling off the preset leaves the custom name
  const toggledPresetOff = toggleClientOrAgency(switchedPreset, 'Khách lẻ / Cá nhân');
  assert.equal(toggledPresetOff, 'Thanh Thúy & Minh Khang');
});

test('normalizeCategoryKey handles case, spaces, and diacritics', () => {
  assert.equal(normalizeCategoryKey('TVC'), 'tvc');
  assert.equal(normalizeCategoryKey('TVC & Commercial'), 'tvccommercial');
  assert.equal(normalizeCategoryKey('  TVC & COMMERCIAL  '), 'tvccommercial');
  assert.equal(normalizeCategoryKey('Social 9:16'), 'social916');
  assert.equal(normalizeCategoryKey('SOCIAL'), 'social');
  assert.equal(normalizeCategoryKey('Event Recap'), 'eventrecap');
  assert.equal(normalizeCategoryKey('EVENT RECAP'), 'eventrecap');
  assert.equal(normalizeCategoryKey('Wedding'), 'wedding');
  assert.equal(normalizeCategoryKey('Cá Nhân'), 'canhan');
  assert.equal(normalizeCategoryKey('CÁ NHÂN'), 'canhan');
  assert.equal(normalizeCategoryKey('Personal Works'), 'personalworks');
  assert.equal(normalizeCategoryKey('PERSONAL WORKS'), 'personalworks');
});

test('getCategoryMeta standardizes industry subtitles for all 5 production categories', () => {
  // 1. TVC / TVC & Commercial
  const tvcMeta = getCategoryMeta('TVC');
  assert.equal(tvcMeta.title, 'TVC & Commercial');
  assert.equal(tvcMeta.subtitle, 'Phim quảng cáo, Digital Commercial & Video thương hiệu');
  assert.equal(tvcMeta.isVertical, false);

  const tvcUpper = getCategoryMeta('TVC & COMMERCIAL');
  assert.equal(tvcUpper.subtitle, 'Phim quảng cáo, Digital Commercial & Video thương hiệu');

  // 2. SOCIAL / SOCIAL 9:16
  const socialMeta = getCategoryMeta('Social 9:16');
  assert.equal(socialMeta.subtitle, 'Short-form 9:16, TikTok, Reels & Performance Ads');
  assert.equal(socialMeta.isVertical, true);

  const socialPlain = getCategoryMeta('SOCIAL');
  assert.equal(socialPlain.subtitle, 'Short-form 9:16, TikTok, Reels & Performance Ads');
  assert.equal(socialPlain.isVertical, true);

  // 3. EVENT RECAP
  const eventMeta = getCategoryMeta('Event Recap');
  assert.equal(eventMeta.subtitle, 'Corporate Highlight, Aftermovie & Sự kiện doanh nghiệp');
  assert.equal(eventMeta.isVertical, false);

  const eventUpper = getCategoryMeta('EVENT RECAP');
  assert.equal(eventUpper.subtitle, 'Corporate Highlight, Aftermovie & Sự kiện doanh nghiệp');

  // 4. WEDDING
  const weddingMeta = getCategoryMeta('Wedding');
  assert.equal(weddingMeta.subtitle, 'Wedding Highlight, Pre-wedding & Phóng sự cưới điện ảnh');
  assert.equal(weddingMeta.isVertical, false);

  const weddingUpper = getCategoryMeta('WEDDING');
  assert.equal(weddingUpper.subtitle, 'Wedding Highlight, Pre-wedding & Phóng sự cưới điện ảnh');

  // 5. CÁ NHÂN / PERSONAL / PERSONAL WORKS
  const caNhanMeta = getCategoryMeta('Cá Nhân');
  assert.equal(caNhanMeta.subtitle, 'Cinematography, Spec Ads & Dự án sáng tạo độc lập');
  assert.equal(caNhanMeta.isVertical, false);

  const caNhanUpper = getCategoryMeta('CÁ NHÂN');
  assert.equal(caNhanUpper.subtitle, 'Cinematography, Spec Ads & Dự án sáng tạo độc lập');

  const personalMeta = getCategoryMeta('PERSONAL WORKS');
  assert.equal(personalMeta.subtitle, 'Cinematography, Spec Ads & Dự án sáng tạo độc lập');
});

test('getCategoryMeta supports custom subtitles and hiding subtitles when empty', () => {
  // Custom override for TVC
  const customTvc = getCategoryMeta('TVC', {
    TVC: 'Chiến dịch thương hiệu lớn & Brand Story',
  });
  assert.equal(customTvc.subtitle, 'Chiến dịch thương hiệu lớn & Brand Story');

  // Custom empty override to hide subtitle
  const hiddenTvc = getCategoryMeta('TVC', {
    TVC: '',
  });
  assert.equal(hiddenTvc.subtitle, '');

  // Custom new category without subtitle returns empty string (never template string)
  const newCat = getCategoryMeta('Documentary Film');
  assert.equal(newCat.subtitle, '');
  assert.notEqual(newCat.subtitle, 'Sản phẩm thuộc hạng mục Documentary Film');

  // Custom new category with custom subtitle
  const newCatWithSub = getCategoryMeta('Documentary Film', {
    'Documentary Film': 'Phim tài liệu dài tập & Phỏng vấn chiều sâu',
  });
  assert.equal(newCatWithSub.subtitle, 'Phim tài liệu dài tập & Phỏng vấn chiều sâu');
});

test('capitalizeWords capitalizes the first letter of each word in Vietnamese and English', () => {
  // Vietnamese titles with lowercase
  assert.equal(
    capitalizeWords('việt kiều về nước làm răng có lợi ích gì'),
    'Việt Kiều Về Nước Làm Răng Có Lợi Ích Gì'
  );
  assert.equal(
    capitalizeWords('phóng sự cưới điện ảnh — ngày chung đôi'),
    'Phóng Sự Cưới Điện Ảnh — Ngày Chung Đôi'
  );
  assert.equal(
    capitalizeWords('nụ cười việt nam (bản đầy đủ)'),
    'Nụ Cười Việt Nam (Bản Đầy Đủ)'
  );

  // English & Commercial brands
  assert.equal(
    capitalizeWords('pepsi electric blue — summer launch'),
    'Pepsi Electric Blue — Summer Launch'
  );
  assert.equal(
    capitalizeWords('short-form video tiktok & reels ads'),
    'Short-Form Video Tiktok & Reels ADS'
  );
  assert.equal(
    capitalizeWords('chiến dịch TikTok creator'),
    'Chiến Dịch TikTok Creator'
  );

  // Preserves existing industry acronyms
  assert.equal(
    capitalizeWords('TVC 30s vinfast vf9 - công nghệ dẫn lối'),
    'TVC 30s Vinfast Vf9 - Công Nghệ Dẫn Lối'
  );
  assert.equal(
    capitalizeWords('mv ca nhạc 4K hdr (dop trần quốc vinh)'),
    'MV Ca Nhạc 4K Hdr (DOP Trần Quốc Vinh)'
  );

  // Edge cases
  assert.equal(capitalizeWords(''), '');
  assert.equal(capitalizeWords('   '), '   ');
});
