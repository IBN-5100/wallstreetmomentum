/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/pricing',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;