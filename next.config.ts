import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Development only, and it has no effect on a deployed build.
   *
   * `next dev` serves its client chunks and hot-reload socket only to the
   * origin it thinks it is being browsed from, which is localhost. Open the
   * same server at 127.0.0.1, or at the machine's address on the network to
   * try the forms on a phone, and every one of those requests is refused —
   * the pages still render, because that is the server, but nothing hydrates
   * and every button on the application form silently does nothing.
   *
   * It takes a while to work out, because a page that renders perfectly and
   * ignores its own buttons does not look like a networking problem.
   */
  allowedDevOrigins: ["127.0.0.1", "192.168.84.39"],
};

export default nextConfig;
