/**
 * Renders the "OrdrMoor | Digital Menu" static landing at route /.
 * Content is served from /landing/index.html (copied from OrdrMoor | Digital Menu folder).
 */
export default function DigitalMenuLandingPage() {
  return (
    <iframe
      src="/landing/index.html"
      title="OrdrMoor Digital Menu"
      className="fixed inset-0 w-full h-full border-0 block"
      style={{ minHeight: '100vh' }}
    />
  );
}
