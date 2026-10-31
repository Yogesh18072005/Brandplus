import {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

type SeekableFilmWindow = Window & {seek: (time: number) => void; __ready: Promise<boolean>};

/** Identical single-file composition in Remotion Studio and Hyperframes. */
export const BrandPulseLaunch15 = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const iframe = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [handle] = useState(() => delayRender('Loading the signal-ring composition'));

  useLayoutEffect(() => {
    if (loaded) (iframe.current?.contentWindow as SeekableFilmWindow | null)?.seek(frame / fps);
  }, [frame, fps, loaded]);

  return (
    <AbsoluteFill style={{backgroundColor: '#f5f7fb'}}>
      <iframe
        ref={iframe}
        title="BrandPulse — The signal ring"
        src={staticFile('launch15/index.html')}
        style={{width: 1920, height: 1080, border: 0}}
        onLoad={async () => {
          const film = iframe.current?.contentWindow as SeekableFilmWindow | null;
          if (!film) return;
          await film.__ready;
          film.seek(frame / fps);
          setLoaded(true);
          continueRender(handle);
        }}
      />
      <Audio src={staticFile('launch15/score.wav')} />
    </AbsoluteFill>
  );
};
