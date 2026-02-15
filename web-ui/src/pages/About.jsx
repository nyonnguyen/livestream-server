import { Mail, Heart, Code, Github } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function About() {
  const { t } = useTranslation();
  const version = "0.9.0-beta";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-8 text-white mb-6">
        <div className="flex items-center gap-4 mb-4">
          <img src="/icon.svg" alt={t('about.title')} className="w-20 h-20" />
          <div>
            <h1 className="text-3xl font-bold">{t('about.title')}</h1>
            <p className="text-indigo-100 text-lg">{t('about.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 w-fit">
          <span className="text-sm font-medium">{t('about.version')}</span>
          <span className="text-xl font-bold">{version}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Author Info */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-600" />
            {t('about.author')}
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-600 text-sm">{t('about.createdBy')}</p>
              <p className="text-lg font-semibold text-gray-900">{t('about.authorName')}</p>
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
            {t('about.project')}
          </h2>
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 font-medium flex items-center gap-2">
                <Heart className="w-4 h-4 fill-green-600 text-green-600" />
                {t('about.nonProfit')}
              </p>
              <p className="text-green-700 text-sm mt-1">
                {t('about.nonProfitDesc')}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">{t('about.license')}</p>
              <p className="text-gray-900 font-medium">{t('about.mitLicense')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="card mt-6">
        <h2 className="text-xl font-bold mb-4">{t('about.aboutProject')}</h2>
        <div className="prose max-w-none text-gray-700">
          <p className="mb-3">
            {t('about.description')}
          </p>

          <h3 className="text-lg font-semibold mt-4 mb-2">{t('about.keyFeatures')}</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>{t('about.lowLatency')}</strong> {t('about.lowLatencyDesc')}
            </li>
            <li>
              <strong>{t('about.multipleProtocols')}</strong> {t('about.multipleProtocolsDesc')}
            </li>
            <li>
              <strong>{t('about.resourceEfficient')}</strong> {t('about.resourceEfficientDesc')}
            </li>
            <li>
              <strong>{t('about.webManagement')}</strong> {t('about.webManagementDesc')}
            </li>
            <li>
              <strong>{t('about.dualNetwork')}</strong> {t('about.dualNetworkDesc')}
            </li>
            <li>
              <strong>{t('about.sessionMonitoring')}</strong> {t('about.sessionMonitoringDesc')}
            </li>
            <li>
              <strong>{t('about.dockerDeployment')}</strong> {t('about.dockerDeploymentDesc')}
            </li>
          </ul>

          <h3 className="text-lg font-semibold mt-4 mb-2">{t('about.techStack')}</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>{t('about.srs')}</strong> {t('about.srsDesc')}</li>
            <li><strong>{t('about.nodejs')}</strong> {t('about.nodejsDesc')}</li>
            <li><strong>{t('about.react')}</strong> {t('about.reactDesc')}</li>
            <li><strong>{t('about.sqlite')}</strong> {t('about.sqliteDesc')}</li>
            <li><strong>{t('about.docker')}</strong> {t('about.dockerDesc')}</li>
          </ul>
        </div>
      </div>

      {/* Version Info */}
      <div className="card mt-6">
        <h2 className="text-xl font-bold mb-4">{t('about.versionInfo')}</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-900 font-medium mb-2">{t('about.currentVersion', { version })}</p>
          <p className="text-blue-800 text-sm">
            {t('about.betaNotice')}
          </p>
        </div>

        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <h3 className="font-semibold text-gray-900">{t('about.roadmap')}</h3>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>{t('about.roadmapItem1')}</li>
            <li>{t('about.roadmapItem2')}</li>
            <li>{t('about.roadmapItem3')}</li>
            <li>{t('about.roadmapItem4')}</li>
            <li>{t('about.roadmapItem5')}</li>
          </ul>
        </div>
      </div>

      {/* Contact & Support */}
      <div className="card mt-6 bg-gradient-to-r from-gray-50 to-gray-100">
        <h2 className="text-xl font-bold mb-4">{t('about.supportContributions')}</h2>
        <div className="space-y-3 text-gray-700">
          <p>
            {t('about.contactDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:nyonnguyen@gmail.com"
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {t('about.emailSupport')}
            </a>
            <button className="btn-secondary flex items-center justify-center gap-2">
              <Github className="w-4 h-4" />
              {t('about.githubSoon')}
            </button>
          </div>
          <p className="text-sm text-gray-600 italic mt-3">
            {t('about.tagline')}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm mt-8 pb-8">
        <p>{t('about.footer')}</p>
        <p className="mt-1">{t('about.footerLove')}</p>
      </div>
    </div>
  );
}
