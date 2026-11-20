import { useEffect, useRef } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

interface PlyrVideoPlayerProps {
  src: string;
  poster?: string;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  className?: string;
}

export function PlyrVideoPlayer({
  src,
  poster,
  onLoadedMetadata,
  className = '',
}: PlyrVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Destroy any existing player instance before attaching a new one
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (err) {
        console.warn('Error destroying existing Plyr player:', err);
      }
      playerRef.current = null;
    }

    try {
      const player = new Plyr(video, {
        controls: [
          'play-large',
          'play',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'settings',
          'pip',
          'fullscreen',
        ],
        settings: ['speed'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        tooltips: { controls: true, seek: true },
        resetOnEnd: true,
        keyboard: { focused: true, global: false },
        autoplay: true,
      });

      playerRef.current = player;
    } catch (err) {
      console.warn('Failed to initialize Plyr:', err);
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.stop();
          playerRef.current.destroy();
        } catch (err) {
          console.warn('Error destroying Plyr player on cleanup:', err);
        }
        playerRef.current = null;
      }
    };
  }, [src]);

  return (
    <div className={`w-full h-full flex items-center justify-center bg-black overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        key={src}
        src={src}
        poster={poster}
        playsInline
        crossOrigin="anonymous"
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        className="w-full h-full object-contain bg-black"
      />
    </div>
  );
}
