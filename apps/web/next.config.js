/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We can enable transpilePackages for react-three-fiber or three if necessary
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
};

module.exports = nextConfig;
