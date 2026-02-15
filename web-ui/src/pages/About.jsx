import { Mail, Heart, Code, Github } from 'lucide-react';

export default function About() {
  const version = "0.9.0-beta";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-8 text-white mb-6">
        <div className="flex items-center gap-4 mb-4">
          <img src="/icon.svg" alt="Nyon Livestream Server" className="w-20 h-20" />
          <div>
            <h1 className="text-3xl font-bold">Nyon Livestream Server</h1>
            <p className="text-indigo-100 text-lg">Low-Latency Streaming Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 w-fit">
          <span className="text-sm font-medium">Version:</span>
          <span className="text-xl font-bold">{version}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Author Info */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-600" />
            Author
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-600 text-sm">Created by</p>
              <p className="text-lg font-semibold text-gray-900">Nyon</p>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="w-4 h-4 text-indigo-600" />
              <a
                href="mailto:nyonnguyen@gmail.com"
                className="hover:text-indigo-600 transition-colors"
              >
                nyonnguyen@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Project
          </h2>
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 font-medium flex items-center gap-2">
                <Heart className="w-4 h-4 fill-green-600 text-green-600" />
                Non-Profit Project
              </p>
              <p className="text-green-700 text-sm mt-1">
                Free and open-source software for the community
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">License</p>
              <p className="text-gray-900 font-medium">MIT License</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="card mt-6">
        <h2 className="text-xl font-bold mb-4">About This Project</h2>
        <div className="prose max-w-none text-gray-700">
          <p className="mb-3">
            Nyon Livestream Server is a lightweight, low-latency streaming platform designed specifically
            for Raspberry Pi and similar ARM-based devices. It enables you to ingest video streams from
            cameras, drones, or mobile devices and distribute them with minimal delay.
          </p>

          <h3 className="text-lg font-semibold mt-4 mb-2">Key Features:</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>Low Latency:</strong> Sub-second streaming delay using HTTP-FLV and optimized SRS configuration
            </li>
            <li>
              <strong>Multiple Protocols:</strong> RTMP and SRT for publishing, HTTP-FLV for playback
            </li>
            <li>
              <strong>Resource Efficient:</strong> Relay-only mode uses minimal CPU and memory
            </li>
            <li>
              <strong>Web Management:</strong> Modern React-based dashboard for stream management
            </li>
            <li>
              <strong>Dual Network Support:</strong> LAN and Public IP access with automatic detection
            </li>
            <li>
              <strong>Session Monitoring:</strong> Real-time viewer tracking and bandwidth monitoring
            </li>
            <li>
              <strong>Docker Deployment:</strong> Easy setup with Docker Compose
            </li>
          </ul>

          <h3 className="text-lg font-semibold mt-4 mb-2">Technology Stack:</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>SRS</strong> (Simple Realtime Server) - Streaming engine</li>
            <li><strong>Node.js + Express</strong> - REST API backend</li>
            <li><strong>React + Vite</strong> - Modern web interface</li>
            <li><strong>SQLite</strong> - Lightweight database</li>
            <li><strong>Docker</strong> - Containerized deployment</li>
          </ul>
        </div>
      </div>

      {/* Version Info */}
      <div className="card mt-6">
        <h2 className="text-xl font-bold mb-4">Version Information</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-900 font-medium mb-2">Current Version: {version}</p>
          <p className="text-blue-800 text-sm">
            This is a beta version. The project is under active development. Version 1.0.0 will be
            released once all core features are stable and thoroughly tested.
          </p>
        </div>

        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <h3 className="font-semibold text-gray-900">Roadmap to 1.0.0:</h3>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Complete stability testing on Raspberry Pi 3/4/5</li>
            <li>Performance optimization and latency improvements</li>
            <li>Comprehensive documentation and guides</li>
            <li>User feedback integration</li>
            <li>Security audit and hardening</li>
          </ul>
        </div>
      </div>

      {/* Contact & Support */}
      <div className="card mt-6 bg-gradient-to-r from-gray-50 to-gray-100">
        <h2 className="text-xl font-bold mb-4">Support & Contributions</h2>
        <div className="space-y-3 text-gray-700">
          <p>
            This is a community-driven project. If you encounter issues, have feature requests,
            or want to contribute, please reach out:
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:nyonnguyen@gmail.com"
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email Support
            </a>
            <button className="btn-secondary flex items-center justify-center gap-2">
              <Github className="w-4 h-4" />
              GitHub (Coming Soon)
            </button>
          </div>
          <p className="text-sm text-gray-600 italic mt-3">
            Built with passion for the maker community. Enjoy streaming!
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm mt-8 pb-8">
        <p>© 2026 Nyon. Released under MIT License.</p>
        <p className="mt-1">Made with ❤️ for the Raspberry Pi community</p>
      </div>
    </div>
  );
}
