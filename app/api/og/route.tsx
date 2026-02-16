import { ImageResponse } from 'next/og';
 
export const runtime = 'edge';
 
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
 
    // ?title=<title>
    const hasTitle = searchParams.has('title');
    const title = hasTitle
      ? searchParams.get('title')?.slice(0, 100)
      : 'Vibe Check';
 
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            backgroundImage: 'linear-gradient(to bottom right, #2e1065, #000)',
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
             {/* Logo Icon Simulation */}
             <div style={{ 
               width: '60px', 
               height: '60px', 
               borderRadius: '15px', 
               background: 'linear-gradient(to bottom right, #8b5cf6, #d946ef)',
               marginRight: '20px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               color: 'white',
               fontSize: '32px',
               fontWeight: 'bold'
             }}>
               V
             </div>
             <div
                style={{
                  fontSize: 60,
                  fontWeight: 900,
                  color: 'white',
                  letterSpacing: '-0.05em',
                  backgroundClip: 'text',
                  backgroundImage: 'linear-gradient(to right, #fff, #e9d5ff)',
                  color: 'transparent',
                }}
              >
                Vibe Check
            </div>
          </div>

          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.8)',
              marginTop: '10px',
              textAlign: 'center',
              maxWidth: '80%',
            }}
          >
            {title === 'Vibe Check' ? 'Discover your friendship soul.' : `Join ${title}'s Squad`}
          </div>
          
          <div
            style={{
               marginTop: '40px',
               padding: '10px 30px',
               borderRadius: '50px',
               backgroundColor: 'rgba(255,255,255,0.1)',
               border: '1px solid rgba(255,255,255,0.2)',
               color: '#fff',
               fontSize: 24,
            }}
          >
             No Login Required • Real-time
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
