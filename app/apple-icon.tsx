import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom right, #2e1065, #000)',
          color: 'white',
        }}
      >
        <div
            style={{
              width: '140px',
              height: '140px',
              background: 'linear-gradient(to bottom right, #8b5cf6, #d946ef)',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 80,
              fontWeight: 800,
            }}
        >
             V
        </div>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
