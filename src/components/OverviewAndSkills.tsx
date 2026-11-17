import { CheckCircle2, Film, Laptop, Layers, Sparkles } from 'lucide-react';
import { MaskedRevealTitle } from './MaskedRevealTitle';
import { ScrollRevealText } from './ScrollRevealText';
import { RevealGroup, RevealItem } from './ScrollReveal';
import {
  AGENCY_SERVICES,
  EDUCATION_MILESTONES,
  EXPERIENCE_MILESTONES,
} from '../data/portfolioData';
import { DEFAULT_SOFTWARE_TOOLS } from '../data/defaultContent';
import { renderSoftwareIcon, parseToolEntry } from '../utils/softwareIcons';

import type { EducationItem, ExperienceItem, GearSpecSheetData, SoftwareToolType } from '../types/portfolio';

interface OverviewAndSkillsProps {
  onOpenContact: () => void;
  gear?: GearSpecSheetData;
  agencySubtitle?: string;
  tools?: SoftwareToolType[];
  experience?: ExperienceItem[];
  education?: EducationItem[];
}

function renderToolBadgeIcon(name: string) {
  return renderSoftwareIcon(name, 'md');
}

function _deprecatedToolIcons() {
  const lower = '';
  if (lower.includes('davinci') || lower.includes('resolve')) {
    return (
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0B1120] border border-white/10 flex items-center justify-center p-1 shrink-0">
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* DaVinci Outer Border Frame (White) */}
          <path
            d="M17.621 0 5.977.004c-1.37 0-2.756.345-3.762 1.11a4.925 4.925 0 0 0-1.61 2.003C.233 3.93 0 5.02 0 5.951l.012 12.2c.002 1.604.479 3.057 1.461 4.112.984 1.056 2.462 1.683 4.331 1.691L16.856 24c1.26.005 3.095-.036 4.303-.714 1.075-.605 2.025-1.556 2.497-2.984.278-.84.345-2.084.344-3.147l-.021-11.13c-.002-.888-.15-2.023-.547-2.934-.425-.976-1.181-1.815-2.322-2.425C20.353.26 19.123 0 17.622 0zm0 .93c1.378 0 2.538.295 3.04.565.977.523 1.544 1.166 1.889 1.96.315.721.47 1.793.473 2.572l.018 11.13c.002 1.013-.097 2.257-.298 2.86-.396 1.202-1.146 1.946-2.063 2.462-.814.457-2.612.593-3.82.588l-11.05-.044c-1.657-.007-2.832-.534-3.626-1.386-.792-.851-1.212-2.06-1.212-3.485L.999 5.95c0-.829.196-1.827.474-2.437.345-.757.75-1.207 1.365-1.674C3.585 1.27 4.868.97 6.08.97z"
            fill="#FFFFFF"
          />
          {/* Top blade: Sky blue #38BDF8 */}
          <path
            d="M11.961 4.353c-1.976.089-3.204 1.658-3.214 3.29.019 1.443 1.635 3.481 2.884 4.53.12.099.154.109.33.18.062.025.198-.047.327-.135.36-.245.993-.947 1.648-1.738a7.67 7.67 0 0 0 1.031-1.683c.409-.89.261-1.599.235-1.888a3.983 3.983 0 0 0-.99-1.692 3.36 3.36 0 0 0-2.251-.864z"
            fill="#38BDF8"
          />
          {/* Left blade: Rose / red #F43F5E */}
          <path
            d="M7.701 12.313a6.201 6.201 0 0 0-.752.047c-.596.078-.932.273-1.29.51a3.177 3.177 0 0 0-1.365 1.979c-.075.552-.086 1.053.033 1.507.433 1.389 1.326 2.222 2.847 2.452.636.028 1.37-.063 1.99-.45 1.269-.782 2.08-3.17 2.412-4.742.053-.176.035-.357-.013-.42-.005-.067-.044-.113-.19-.183-.398-.192-1.32-.417-2.375-.6a7.68 7.68 0 0 0-1.297-.1z"
            fill="#F43F5E"
          />
          {/* Right blade: Gold yellow #FACC15 */}
          <path
            d="M16.133 12.275a10.185 10.185 0 0 0-3.244.61c-.15.058-.26.1-.374.17-.057.036-.11.135-.105.292.017.433.29 1.278.624 2.27.384 1.135 1.066 2.27 1.844 2.74a3.23 3.23 0 0 0 2.53.342c.832-.243 1.595-.868 1.962-1.546.986-1.818.19-3.548-1.121-4.417-.447-.296-1.133-.445-1.89-.46-.074 0-.15-.002-.226-.001z"
            fill="#FACC15"
          />
        </svg>
      </div>
    );
  }

  // Adobe After Effects
  if (lower.includes('after effects') || lower.includes('ae')) {
    return (
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden shrink-0">
        <svg
          viewBox="0 0 83 80"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip_ae)">
            <path
              d="M67.5214 0H14.5299C6.50526 0 0 6.50526 0 14.5299V65.4701C0 73.4947 6.50526 80 14.5299 80H67.5214C75.546 80 82.0513 73.4947 82.0513 65.4701V14.5299C82.0513 6.50526 75.546 0 67.5214 0Z"
              fill="#00005B"
            />
            <path
              d="M32.9624 47.8634H20.2474L17.6604 55.915C17.6252 56.0616 17.54 56.1913 17.4194 56.2817C17.2988 56.3721 17.1504 56.4177 16.9999 56.4104H10.5599C10.1927 56.4104 10.0642 56.2086 10.1746 55.805L21.1832 24.2314C21.2932 23.9012 21.4034 23.5783 21.5134 23.156C21.6576 22.4216 21.7313 21.6752 21.7336 20.9268C21.7261 20.8745 21.731 20.8212 21.7477 20.771C21.7644 20.7209 21.7926 20.6753 21.83 20.6379C21.8674 20.6005 21.9129 20.5723 21.9631 20.5556C22.0132 20.5389 22.0666 20.534 22.1189 20.5415H30.8708C31.127 20.5415 31.2738 20.6332 31.3111 20.8168L43.8058 55.86C43.9158 56.2272 43.8057 56.4107 43.4756 56.4104H36.32C36.1971 56.4241 36.0734 56.3925 35.9721 56.3216C35.8708 56.2507 35.7988 56.1453 35.7696 56.0251L32.9624 47.8634ZM22.2291 41.0745H30.9258C30.7056 40.3409 30.4487 39.5152 30.1551 38.5975C29.861 37.6807 29.5491 36.6991 29.2194 35.6527C28.8892 34.607 28.559 33.5611 28.2287 32.5153C27.8985 31.4695 27.5957 30.4604 27.3204 29.4879C27.0453 28.5161 26.7976 27.6263 26.5774 26.8184H26.5223C26.2126 28.305 25.8268 29.7747 25.3664 31.2218C24.8521 32.8731 24.3292 34.5611 23.7977 36.2857C23.2654 38.011 22.7425 39.6072 22.2291 41.0745Z"
              fill="#9999FF"
            />
            <path
              d="M64.0619 44.7295H53.2185C53.3513 45.8024 53.7076 46.8355 54.2644 47.7622C54.8799 48.6798 55.7504 49.3973 56.7687 49.8263C58.1487 50.4234 59.6413 50.716 61.1447 50.684C62.3374 50.6611 63.5256 50.5306 64.6949 50.2942C65.7407 50.153 66.7656 49.8858 67.7473 49.4985C67.9304 49.3523 68.0226 49.4435 68.0226 49.7737V55.0028C68.0316 55.1452 68.0031 55.2876 67.9399 55.4156C67.8769 55.5157 67.7923 55.6003 67.6922 55.6632C66.6033 56.1456 65.4574 56.4869 64.2821 56.6791C62.6854 56.979 61.0627 57.1173 59.4383 57.092C56.8323 57.092 54.6489 56.6883 52.8882 55.881C51.2236 55.1477 49.7535 54.0357 48.5949 52.6335C47.5127 51.3123 46.7077 49.7866 46.228 48.1475C45.753 46.5297 45.512 44.8522 45.5125 43.1661C45.5074 41.3251 45.7954 39.4949 46.3657 37.7444C46.9149 36.0369 47.7834 34.4492 48.9252 33.0658C50.0513 31.6985 51.4595 30.5908 53.0534 29.8182C54.6677 29.0296 56.5761 28.7466 58.7778 28.7466C60.6037 28.7005 62.4173 29.0576 64.0894 29.7924C65.4955 30.3921 66.7333 31.3269 67.6947 32.5153C68.5965 33.679 69.2859 34.9927 69.7313 36.3959C70.165 37.7481 70.3878 39.1591 70.3918 40.5791C70.3918 41.3867 70.3643 42.1206 70.3092 42.7808C70.2543 43.4413 70.2084 43.9183 70.1716 44.2119C70.1574 44.3333 70.099 44.4452 70.0077 44.5263C69.9163 44.6075 69.7984 44.6523 69.6762 44.6523C69.456 44.6523 69.0799 44.6798 68.5479 44.7349C68.0155 44.7899 67.355 44.8266 66.5664 44.8449C65.7768 44.8638 64.9426 44.7295 64.0619 44.7295ZM53.2185 39.7153H60.4291C61.3098 39.7153 61.9611 39.7061 62.383 39.6878C62.6654 39.6595 62.938 39.5692 63.1813 39.4232V39.0929C63.1702 38.6624 63.096 38.2359 62.9611 37.827C62.6641 36.8879 62.0671 36.0723 61.2616 35.5055C60.4561 34.9387 59.4869 34.652 58.5027 34.6895C57.5764 34.6335 56.6538 34.8483 55.8474 35.3077C55.0411 35.7671 54.3858 36.4511 53.9616 37.2765C53.5845 38.0442 53.3336 38.8677 53.2185 39.7153Z"
              fill="#9999FF"
            />
          </g>
          <defs>
            <clipPath id="clip_ae">
              <rect width="82.0513" height="80" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </div>
    );
  }

  // Adobe Photoshop
  if (lower.includes('photoshop') || lower.includes('ps')) {
    return (
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden shrink-0">
        <svg
          viewBox="0 0 83 80"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip_ps)">
            <path
              d="M67.5214 0H14.5299C6.50526 0 0 6.50526 0 14.5299V65.4701C0 73.4947 6.50526 80 14.5299 80H67.5214C75.546 80 82.0513 73.4947 82.0513 65.4701V14.5299C82.0513 6.50526 75.546 0 67.5214 0Z"
              fill="#001E36"
            />
            <path
              d="M18.4758 56.1007V20.9284C18.4758 20.6721 18.5859 20.5431 18.8061 20.5431C19.3926 20.5431 19.928 20.5345 20.7357 20.5156C21.5425 20.4975 22.414 20.4792 23.3502 20.4606C24.286 20.4424 25.2768 20.4241 26.3226 20.4055C27.3683 20.3874 28.4049 20.3783 29.4324 20.3779C32.2207 20.3779 34.5692 20.7265 36.4778 21.4238C38.1996 22.0062 39.7697 22.9651 41.074 24.2309C42.1797 25.3281 43.0341 26.6521 43.5784 28.1115C44.0933 29.5318 44.3542 31.0316 44.3491 32.5424C44.3491 35.4786 43.6702 37.9005 42.3125 39.808C40.9458 41.7235 39.0247 43.1739 36.8082 43.9638C34.4964 44.8264 31.9274 45.1189 29.1022 45.1189C28.2946 45.1189 27.7258 45.1098 27.3958 45.0914C27.0656 45.0733 26.5703 45.0641 25.9098 45.0639V56.0457C25.9194 56.113 25.9132 56.1816 25.8917 56.2461C25.8702 56.3106 25.834 56.3692 25.7859 56.4172C25.7378 56.4653 25.6792 56.5015 25.6147 56.523C25.5502 56.5445 25.4816 56.5507 25.4143 56.5411H18.8611C18.604 56.5411 18.4758 56.3948 18.4758 56.1007ZM25.9098 27.1482V38.62C26.3862 38.657 26.8265 38.6753 27.2307 38.675H29.0471C30.3836 38.6706 31.7113 38.4586 32.9828 38.0467C34.0732 37.7228 35.0476 37.0923 35.7899 36.2303C36.5054 35.3866 36.8632 34.2124 36.8633 32.7076C36.8923 31.6428 36.6153 30.5921 36.065 29.6802C35.4866 28.7983 34.6506 28.1161 33.6707 27.7262C32.3913 27.2289 31.0246 26.9949 29.6526 27.0382C28.7718 27.0382 27.9921 27.0473 27.3134 27.0656C26.6339 27.0846 26.1661 27.1121 25.9098 27.1482Z"
              fill="#31A8FF"
            />
            <path
              d="M65.6311 36.534C64.5967 36.0025 63.495 35.6137 62.3561 35.3781C61.1011 35.0902 59.8181 34.9425 58.5306 34.9377C57.8342 34.9189 57.1387 35.0023 56.4665 35.1855C56.0386 35.2807 55.6583 35.5245 55.3931 35.8735C55.2137 36.1526 55.1182 36.4774 55.118 36.8092C55.128 37.1311 55.2441 37.4407 55.4482 37.6899C55.7697 38.066 56.1626 38.3747 56.604 38.5981C57.3888 39.0207 58.1975 39.3975 59.0259 39.7265C60.8732 40.3449 62.6384 41.1858 64.2825 42.2309C65.4025 42.9378 66.3293 43.9119 66.9796 45.0656C67.5265 46.1581 67.8003 47.3669 67.7778 48.5884C67.8107 50.2013 67.3498 51.7858 66.4568 53.1294C65.5007 54.4933 64.1728 55.5537 62.6312 56.1842C60.961 56.9179 58.8969 57.2849 56.439 57.2851C54.8775 57.3009 53.3186 57.1533 51.7878 56.8448C50.5818 56.6236 49.4077 56.2539 48.2926 55.7439C48.1722 55.6818 48.0721 55.5867 48.0039 55.4697C47.9356 55.3527 47.9021 55.2187 47.9073 55.0834V49.1388C47.9007 49.0806 47.91 49.0217 47.9342 48.9683C47.9585 48.915 47.9968 48.8693 48.045 48.836C48.0923 48.8093 48.1466 48.7976 48.2006 48.8026C48.2547 48.8075 48.306 48.8288 48.3477 48.8636C49.6646 49.6401 51.0945 50.2065 52.5859 50.5424C53.9005 50.8719 55.2489 51.0473 56.604 51.0653C57.8881 51.0653 58.833 50.9001 59.4387 50.5699C59.7123 50.4447 59.9437 50.2429 60.1049 49.9889C60.2661 49.7349 60.3502 49.4396 60.347 49.1388C60.347 48.6623 60.0718 48.2037 59.5214 47.7627C58.971 47.3224 57.8518 46.7903 56.1637 46.1664C54.4354 45.5649 52.7967 44.7317 51.2924 43.6896C50.2165 42.9413 49.3305 41.9516 48.7054 40.7998C48.1641 39.7152 47.8904 38.5167 47.9073 37.3046C47.9042 35.8482 48.3043 34.4194 49.0632 33.1764C49.9284 31.8076 51.1709 30.718 52.641 30.039C54.2553 29.2322 56.2735 28.8286 58.6958 28.828C60.1143 28.8166 61.5315 28.9178 62.934 29.1307C63.9497 29.2596 64.9426 29.5281 65.8847 29.9289C65.9594 29.9503 66.0281 29.9888 66.0854 30.0413C66.1427 30.0939 66.1871 30.159 66.2149 30.2316C66.2521 30.366 66.2706 30.5049 66.27 30.6444V36.2037C66.2738 36.2684 66.2605 36.333 66.2316 36.3909C66.2026 36.4489 66.1589 36.4982 66.1049 36.534C66.0313 36.5706 65.9502 36.5897 65.868 36.5897C65.7858 36.5897 65.7047 36.5706 65.6311 36.534Z"
            fill="#31A8FF"
          />
        </g>
        <defs>
          <clipPath id="clip_ps">
            <rect width="82.0513" height="80" fill="white" />
          </clipPath>
        </defs>
      </svg>
      </div>
    );
  }

  // Adobe Illustrator
  if (lower.includes('illustrator') || lower.includes('ai')) {
    return (
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden shrink-0">
        <svg
          viewBox="0 0 83 80"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip_ai)">
            <path
              d="M67.5214 0H14.5299C6.50526 0 0 6.50526 0 14.5299V65.4701C0 73.4947 6.50526 80 14.5299 80H67.5214C75.546 80 82.0513 73.4947 82.0513 65.4701V14.5299C82.0513 6.50526 75.546 0 67.5214 0Z"
              fill="#330000"
            />
            <path
              d="M39.7607 48.0096H27.0459L24.4589 56.0459C24.4237 56.1924 24.3384 56.3221 24.2178 56.4125C24.0972 56.503 23.9489 56.5485 23.7984 56.5413H17.3584C16.9911 56.5413 16.8627 56.3395 16.9731 55.9358L27.9815 24.2312C28.0917 23.901 28.2018 23.5249 28.3119 23.1028C28.4559 22.3684 28.5296 21.622 28.5321 20.8736C28.5246 20.8213 28.5294 20.7679 28.5461 20.7178C28.5629 20.6676 28.591 20.6221 28.6284 20.5847C28.6658 20.5473 28.7114 20.5191 28.7615 20.5024C28.8117 20.4856 28.865 20.4808 28.9174 20.4883H37.669C37.9255 20.4883 38.0722 20.58 38.1094 20.7635L50.6042 55.9908C50.7143 56.3581 50.6041 56.5416 50.2739 56.5413H43.1183C42.9954 56.5549 42.8717 56.5233 42.7704 56.4524C42.6692 56.3815 42.5971 56.2761 42.5679 56.156L39.7607 48.0096ZM29.0274 41.0743H37.7241C37.504 40.3407 37.2471 39.515 36.9536 38.5973C36.6594 37.6805 36.3476 36.6989 36.0179 35.6525C35.6876 34.6068 35.3572 33.561 35.027 32.5151C34.6968 31.4693 34.3941 30.4602 34.1189 29.4877C33.8436 28.5159 33.5959 27.6261 33.3759 26.8182H33.3208C33.0109 28.3048 32.6251 29.7745 32.1649 31.2216C31.6506 32.8729 31.1276 34.5609 30.5961 36.2855C30.0637 38.0108 29.5408 39.6071 29.0274 41.0743Z"
              fill="#FF9A00"
            />
            <path
              d="M58.0343 26.3229C57.4729 26.3455 56.9131 26.2493 56.3914 26.0406C55.8697 25.8319 55.398 25.5155 55.007 25.112C54.6171 24.691 54.3142 24.1971 54.1158 23.6587C53.9174 23.1202 53.8274 22.5479 53.851 21.9746C53.831 21.4069 53.9309 20.8414 54.1443 20.315C54.3577 19.7886 54.6798 19.3131 55.0894 18.9197C55.4951 18.5303 55.974 18.2252 56.4984 18.0221C57.0227 17.8189 57.5822 17.7218 58.1443 17.7363C59.4654 17.7363 60.5021 18.1307 61.2543 18.9197C61.634 19.3297 61.9291 19.8105 62.1227 20.3347C62.3163 20.8589 62.4046 21.4162 62.3826 21.9746C62.4056 22.5501 62.3127 23.1245 62.1094 23.6634C61.9061 24.2024 61.5966 24.695 61.1992 25.112C60.7839 25.5214 60.2882 25.8404 59.7435 26.0488C59.1988 26.2572 58.6169 26.3505 58.0343 26.3229ZM54.2362 55.9909V29.6805C54.2362 29.3503 54.3825 29.1851 54.6766 29.1851H61.4469C61.7403 29.1851 61.887 29.3502 61.8873 29.6805V55.9909C61.8873 56.3582 61.7405 56.5416 61.4469 56.5414H54.7317C54.4015 56.5414 54.2364 56.3579 54.2362 55.9909Z"
              fill="#FF9A00"
            />
          </g>
          <defs>
            <clipPath id="clip_ai">
              <rect width="82.0513" height="80" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </div>
    );
  }

  // CapCut
  if (lower.includes('capcut')) {
    return (
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
        <svg
          viewBox="0 0 24.5 24"
          className="w-full h-full text-white"
          fill="currentColor"
          fillRule="evenodd"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M24.189 6.442V2.671l-4.535 2.383V4.91c.002-1.505-1.078-2.411-2.638-2.411H2.64C.993 2.5 0 3.407 0 4.91V8.72L6.354 12 0 15.316v3.8C0 20.595 1 21.5 2.64 21.5h14.373c1.56 0 2.639-.907 2.639-2.382v-.197l4.536 2.409v-3.828L13.64 12 24.19 6.443zM9.982 13.873l7.797 4.083H2.157l7.825-4.083zm7.741-7.828l-7.742 4.057-7.825-4.057h15.567z" />
        </svg>
      </div>
    );
  }

  // Default fallback tool icon
  return (
    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0B1120] border border-white/10 flex items-center justify-center p-1.5 shrink-0">
      <Laptop className="w-4 h-4 text-[#2563EB]" />
    </div>
  );
}

export function OverviewAndSkills({
  onOpenContact,
  gear: customGear,
  agencySubtitle,
  tools: customTools,
  experience: customExperience,
  education: customEducation,
}: OverviewAndSkillsProps) {
  const serviceIcons = [
    <Film key="film" className="w-5 h-5 text-[#2563EB]" />,
    <Layers key="layers" className="w-5 h-5 text-[#2563EB]" />,
    <Sparkles key="sparkles" className="w-5 h-5 text-[#2563EB]" />,
  ];

  const displayTools = customTools && customTools.length > 0 ? customTools : DEFAULT_SOFTWARE_TOOLS;
  const displayExperience = customExperience && customExperience.length > 0 ? customExperience : EXPERIENCE_MILESTONES;
  const displayEducation = customEducation && customEducation.length > 0 ? customEducation : EDUCATION_MILESTONES;

  return (
    <section
      id="dich-vu"
      aria-label="Năng lực thực chiến cho Agency"
      className="w-full bg-[#F7F6F2] text-[#111113] border-t border-black/8 py-20 sm:py-24 md:py-28"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-20">
      {/* 1. Three Actionable Agency Services */}
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <MaskedRevealTitle
              as="h2"
              className="font-bricolage text-2xl md:text-3xl text-[#111113] font-extrabold tracking-tight uppercase leading-[1.25]"
            >
              3 Đầu việc thực chiến cho Agency
            </MaskedRevealTitle>
            <ScrollRevealText
              text={agencySubtitle || 'Nhận từng hạng mục lẻ hoặc trọn gói từ ghi hình đến dựng hoàn thiện.'}
              className="text-sm sm:text-base text-[#555555] font-normal leading-relaxed max-w-2xl"
            />
          </div>

          <button
            type="button"
            onClick={onOpenContact}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#111113] text-white hover:bg-[#2563EB] text-sm font-bold shadow-sm hover:shadow-md transition-all self-start md:self-auto cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <span>Đặt lịch trao đổi brief</span>
            <span className="text-white/80">→</span>
          </button>
        </div>

        {/* Staggered 3 Actionable Agency Services (110ms) */}
        <RevealGroup staggerMs={110} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AGENCY_SERVICES.map((service, idx) => (
            <RevealItem key={service.id} index={idx} className="h-full">
              <div
                className="h-full rounded-2xl bg-white border border-black/10 p-6 sm:p-7 md:p-6 lg:p-7 space-y-4 shadow-2xs hover:shadow-lg hover:border-black/25 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-[#F7F6F2] border border-black/8 flex items-center justify-center">
                      {serviceIcons[idx]}
                    </div>
                    <span className="text-sm font-bold text-[#2563EB] tabular-nums">
                      {service.index}
                    </span>
                  </div>

                  <h3 className="font-bricolage text-lg sm:text-xl text-[#111113] font-bold leading-snug">
                    {service.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#444444] leading-relaxed">
                    {service.description}
                  </p>
                </div>

                {/* Actionable deliverables bullet points */}
                <div className="pt-3.5 border-t border-black/8 space-y-2">
                  {service.deliverables.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-center gap-2 text-xs sm:text-[13px] text-[#222222] font-medium leading-relaxed">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                      <span className="whitespace-nowrap truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>

      {/* 2. Compact Studio Badges Software Tools */}
      <div className="pt-10 border-t border-black/10 space-y-6">
        <div>
          <MaskedRevealTitle
            as="h2"
            className="font-bricolage text-2xl md:text-3xl text-[#111111] font-extrabold tracking-tight uppercase leading-[1.25]"
          >
            Công cụ phần mềm chuyên dụng
          </MaskedRevealTitle>
          <p className="mt-2 text-sm sm:text-base text-[#555555] font-normal leading-relaxed">
            Làm chủ hệ thống công cụ hậu kỳ chuẩn ngành, đảm bảo file bàn giao sạch và đồng bộ.
          </p>
        </div>

        <RevealGroup staggerMs={60} className="flex flex-wrap items-center gap-2.5 sm:gap-3 mt-6">
          {displayTools.map((tool, idx) => {
            const { name, customSvg } = parseToolEntry(tool);
            return (
              <RevealItem key={`${name}-${idx}`} index={idx} className="inline-flex">
                <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-black/10 hover:border-black/25 transition-colors shadow-2xs cursor-default">
                  {renderSoftwareIcon(name, 'md', '', customSvg)}
                  <span className="font-bricolage text-sm font-bold text-[#111111] whitespace-nowrap">
                    {name}
                  </span>
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>

      {/* 3. Refined Hairline Experience & Education */}
      <div id="ho-so" className="pt-12 sm:pt-16 border-t border-black/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Experience Column (Stagger 70ms) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <MaskedRevealTitle
                as="h2"
                className="font-bricolage text-2xl md:text-3xl text-[#111113] font-extrabold tracking-tight uppercase leading-[1.25]"
              >
                Kinh nghiệm làm việc
              </MaskedRevealTitle>
              <p className="mt-2 text-sm sm:text-base text-[#71717A] font-normal leading-relaxed">
                Hơn 5 năm kinh nghiệm thực chiến cùng Agency &amp; Production House tại TP. Hồ Chí Minh.
              </p>
            </div>

            <RevealGroup staggerMs={110} className="border-t border-black/8 divide-y divide-black/8">
              {displayExperience.map((exp, idx) => (
                <RevealItem key={exp.id || `exp-${idx}`} index={idx} className="py-5 sm:py-6 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
                    <h3 className="font-bricolage font-semibold text-base md:text-lg text-[#111113] leading-snug">
                      {exp.role}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#2563EB] font-bold tabular-nums shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" aria-hidden="true" />
                      {exp.period}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#3F3F46] font-medium">
                    {exp.companyOrClients}
                  </p>
                  <p className="text-sm sm:text-base text-[#71717A] leading-relaxed">
                    {exp.scope}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>

          {/* Education & Credentials Column (Stagger 70ms) */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <MaskedRevealTitle
                as="h2"
                className="font-bricolage text-2xl md:text-3xl text-[#111113] font-extrabold tracking-tight uppercase leading-[1.25]"
              >
                Học vấn &amp; Đào tạo
              </MaskedRevealTitle>
              <p className="mt-2 text-sm sm:text-base text-[#71717A] font-normal leading-relaxed">
                Nền tảng thiết kế thị giác bài bản kết hợp chứng chỉ công nghệ hình ảnh chuẩn quốc tế.
              </p>
            </div>

            <RevealGroup staggerMs={110} className="border-t border-black/8 divide-y divide-black/8">
              {displayEducation.map((edu, idx) => (
                <RevealItem key={edu.id || `edu-${idx}`} index={idx} className="py-5 sm:py-6 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
                    <h3 className="font-bricolage font-semibold text-base md:text-lg text-[#111113] leading-snug">
                      {edu.degree}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#2563EB] font-bold tabular-nums shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" aria-hidden="true" />
                      {edu.period}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#3F3F46] font-medium">
                    {edu.institution}
                  </p>
                  <p className="text-sm sm:text-base text-[#71717A] leading-relaxed">
                    {edu.description}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </div>

        {/* Gear Spec Sheet: Personal Production Gear */}
        <RevealGroup staggerMs={70} className="mt-14 pt-12 border-t border-black/10">
          <RevealItem index={0}>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#2563EB] mb-6">
              Thiết bị tác nghiệp cá nhân
            </h3>
          </RevealItem>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Column 1: Camera & Lens */}
            <RevealItem index={1} className="space-y-3">
              <span className="block text-sm sm:text-base font-bold uppercase tracking-wider text-[#111113] mb-2">
                Camera &amp; Lens
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {(customGear?.cameraAndLens || [
                  'Sony ZV-E1 (4K 10-bit)',
                  'Sony FE 20-70mm F4 G',
                  'Lens f/2.8 đa dụng',
                ]).map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#EAE8E1]/70 border border-[#111113]/10 text-xs sm:text-sm font-semibold text-[#111113] shadow-2xs hover:border-[#111113]/25 transition-all cursor-default"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </RevealItem>

            {/* Column 2: Chống rung */}
            <RevealItem index={2} className="space-y-3">
              <span className="block text-sm sm:text-base font-bold uppercase tracking-wider text-[#111113] mb-2">
                Chống rung
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {(customGear?.stabilizer || [
                  'Gimbal DJI RS 3',
                  'Báng pin mở rộng',
                ]).map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#EAE8E1]/70 border border-[#111113]/10 text-xs sm:text-sm font-semibold text-[#111113] shadow-2xs hover:border-[#111113]/25 transition-all cursor-default"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </RevealItem>

            {/* Column 3: Thu âm & Ánh sáng */}
            <RevealItem index={3} className="space-y-3">
              <span className="block text-sm sm:text-base font-bold uppercase tracking-wider text-[#111113] mb-2">
                Thu âm &amp; Ánh sáng
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {(customGear?.audioAndLight || [
                  'Micro không dây đôi',
                  'Filter VND / CPL',
                ]).map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#EAE8E1]/70 border border-[#111113]/10 text-xs sm:text-sm font-semibold text-[#111113] shadow-2xs hover:border-[#111113]/25 transition-all cursor-default"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </RevealItem>
          </div>
        </RevealGroup>
      </div>
    </div>
    </section>
  );
}