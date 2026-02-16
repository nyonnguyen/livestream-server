import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HelpCircle,
  Video,
  Upload,
  Eye,
  Settings,
  Network,
  ChevronDown,
  ChevronUp,
  Play,
  Copy,
  Key,
} from 'lucide-react';

export default function Help() {
  const { t } = useTranslation();
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const Section = ({ id, title, icon: Icon, children }) => {
    const isOpen = openSection === id;

    return (
      <div className="card mb-4">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {isOpen && <div className="px-4 pb-4 space-y-4">{children}</div>}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-8 text-white mb-6">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="w-10 h-10" />
          <h1 className="text-3xl font-bold">{t('help.pageTitle')}</h1>
        </div>
        <p className="text-indigo-100">
          {t('help.pageSubtitle')}
        </p>
      </div>

      {/* Quick Start */}
      <div className="card mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <h2 className="text-xl font-bold mb-3 text-green-900">{t('help.quickStart.title')}</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li className="font-medium">{t('help.quickStart.step1')}</li>
          <li className="font-medium">{t('help.quickStart.step2')}</li>
          <li className="font-medium">{t('help.quickStart.step3')}</li>
          <li className="font-medium">{t('help.quickStart.step4')}</li>
        </ol>
      </div>

      {/* Main Sections */}
      <Section id="streams" title={t('help.streams.title')} icon={Video}>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.streams.creating.title')}</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li dangerouslySetInnerHTML={{ __html: t('help.streams.creating.step1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.streams.creating.step2') }} />
            <li>
              <span dangerouslySetInnerHTML={{ __html: t('help.streams.creating.step3') }} />
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li dangerouslySetInnerHTML={{ __html: t('help.streams.creating.step3a') }} />
                <li dangerouslySetInnerHTML={{ __html: t('help.streams.creating.step3b') }} />
                <li dangerouslySetInnerHTML={{ __html: t('help.streams.creating.step3c') }} />
                <li dangerouslySetInnerHTML={{ __html: t('help.streams.creating.step3d') }} />
                <li dangerouslySetInnerHTML={{ __html: t('help.streams.creating.step3e') }} />
              </ul>
            </li>
            <li dangerouslySetInnerHTML={{ __html: t('help.streams.creating.step4') }} />
          </ol>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.streams.editing.title')}</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li dangerouslySetInnerHTML={{ __html: t('help.streams.editing.item1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.streams.editing.item2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.streams.editing.item3') }} />
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.streams.deleting.title')}</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li dangerouslySetInnerHTML={{ __html: t('help.streams.deleting.item1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.streams.deleting.item2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.streams.deleting.item3') }} />
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.streams.regenerating.title')}</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li dangerouslySetInnerHTML={{ __html: t('help.streams.regenerating.item1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.streams.regenerating.item2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.streams.regenerating.item3') }} />
          </ul>
        </div>
      </Section>

      <Section id="publish" title={t('help.publish.title')} icon={Upload}>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.publish.gettingUrls.title')}</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li dangerouslySetInnerHTML={{ __html: t('help.publish.gettingUrls.step1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.publish.gettingUrls.step2') }} />
            <li>
              <span dangerouslySetInnerHTML={{ __html: t('help.publish.gettingUrls.step3') }} />
            </li>
          </ol>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.publish.obs.title')}</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li dangerouslySetInnerHTML={{ __html: t('help.publish.obs.step1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.publish.obs.step2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.publish.obs.step3') }} />
            <li>
              <span dangerouslySetInnerHTML={{ __html: t('help.publish.obs.step4') }} />
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li dangerouslySetInnerHTML={{ __html: t('help.publish.obs.step4a') }} />
                <li dangerouslySetInnerHTML={{ __html: t('help.publish.obs.step4b') }} />
              </ul>
            </li>
            <li>
              <span dangerouslySetInnerHTML={{ __html: t('help.publish.obs.step5') }} />
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li dangerouslySetInnerHTML={{ __html: t('help.publish.obs.step5a') }} />
              </ul>
            </li>
            <li dangerouslySetInnerHTML={{ __html: t('help.publish.obs.step6') }} />
          </ol>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.publish.ffmpeg.title')}</h3>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
            <p className="text-sm text-gray-400 mb-2">{t('help.publish.ffmpeg.rtmpComment')}</p>
            <code className="text-sm whitespace-pre-wrap">
              {t('help.publish.ffmpeg.rtmpCommand')}
            </code>
            <p className="text-sm text-gray-400 mt-4 mb-2">{t('help.publish.ffmpeg.srtComment')}</p>
            <code className="text-sm whitespace-pre-wrap">
              {t('help.publish.ffmpeg.srtCommand')}
            </code>
          </div>
        </div>

        <div className="border-t pt-4 bg-yellow-50 -mx-4 -mb-4 p-4 rounded-b-lg">
          <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {t('help.publish.encoding.title')}
          </h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 text-sm">
            <li dangerouslySetInnerHTML={{ __html: t('help.publish.encoding.videoCodec') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.publish.encoding.rateControl') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.publish.encoding.keyframe') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.publish.encoding.bitrate') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.publish.encoding.audioCodec') }} />
          </ul>
        </div>
      </Section>

      <Section id="watch" title={t('help.watch.title')} icon={Eye}>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.watch.dashboard.title')}</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.dashboard.step1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.dashboard.step2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.dashboard.step3') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.dashboard.step4') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.dashboard.step5') }} />
          </ol>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.watch.vlc.title')}</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.vlc.step1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.vlc.step2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.vlc.step3') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.vlc.step4') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.vlc.step5') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.vlc.step6') }} />
          </ol>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.watch.obsRestream.title')}</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.obsRestream.step1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.obsRestream.step2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.obsRestream.step3') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.watch.obsRestream.step4') }} />
          </ol>
        </div>
      </Section>

      <Section id="sessions" title={t('help.sessions.title')} icon={Network}>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.sessions.active.title')}</h3>
          <p className="text-gray-700 mb-3" dangerouslySetInnerHTML={{ __html: t('help.sessions.active.description') }} />
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li dangerouslySetInnerHTML={{ __html: t('help.sessions.active.streamName') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.sessions.active.clientId') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.sessions.active.ipAddress') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.sessions.active.protocol') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.sessions.active.duration') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.sessions.active.bitrate') }} />
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.sessions.disconnecting.title')}</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li dangerouslySetInnerHTML={{ __html: t('help.sessions.disconnecting.item1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.sessions.disconnecting.item2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.sessions.disconnecting.item3') }} />
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.sessions.dashboardStats.title')}</h3>
          <p className="text-gray-700" dangerouslySetInnerHTML={{ __html: t('help.sessions.dashboardStats.description') }} />
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 mt-2">
            <li>{t('help.sessions.dashboardStats.item1')}</li>
            <li>{t('help.sessions.dashboardStats.item2')}</li>
            <li>{t('help.sessions.dashboardStats.item3')}</li>
            <li>{t('help.sessions.dashboardStats.item4')}</li>
          </ul>
        </div>
      </Section>

      <Section id="settings" title={t('help.settings.title')} icon={Settings}>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.settings.password.title')}</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li dangerouslySetInnerHTML={{ __html: t('help.settings.password.step1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.settings.password.step2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.settings.password.step3') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.settings.password.step4') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.settings.password.step5') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.settings.password.step6') }} />
          </ol>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.settings.network.title')}</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li dangerouslySetInnerHTML={{ __html: t('help.settings.network.item1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.settings.network.item2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.settings.network.item3') }} />
            <li dangerouslySetInnerHTML={{ __html: t('help.settings.network.item4') }} />
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.settings.security.title')}</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900 font-medium mb-2">{t('help.settings.security.bestPractices')}</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm ml-4">
              <li>{t('help.settings.security.item1')}</li>
              <li>{t('help.settings.security.item2')}</li>
              <li>{t('help.settings.security.item3')}</li>
              <li>{t('help.settings.security.item4')}</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section id="troubleshooting" title={t('help.troubleshooting.title')} icon={HelpCircle}>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.troubleshooting.connection.title')}</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>{t('help.troubleshooting.connection.item1')}</li>
            <li dangerouslySetInnerHTML={{ __html: t('help.troubleshooting.connection.item2') }} />
            <li>{t('help.troubleshooting.connection.item3')}</li>
            <li>{t('help.troubleshooting.connection.item4')}</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.troubleshooting.latency.title')}</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>{t('help.troubleshooting.latency.item1')}</li>
            <li>{t('help.troubleshooting.latency.item2')}</li>
            <li>{t('help.troubleshooting.latency.item3')}</li>
            <li>{t('help.troubleshooting.latency.item4')}</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.troubleshooting.blackScreen.title')}</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>{t('help.troubleshooting.blackScreen.item1')}</li>
            <li>{t('help.troubleshooting.blackScreen.item2')}</li>
            <li>{t('help.troubleshooting.blackScreen.item3')}</li>
            <li>{t('help.troubleshooting.blackScreen.item4')}</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('help.troubleshooting.copyButtons.title')}</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>{t('help.troubleshooting.copyButtons.item1')}</li>
            <li>{t('help.troubleshooting.copyButtons.item2')}</li>
            <li>{t('help.troubleshooting.copyButtons.item3')}</li>
            <li>{t('help.troubleshooting.copyButtons.item4')}</li>
          </ul>
        </div>
      </Section>

      {/* Footer */}
      <div className="card bg-gradient-to-r from-indigo-50 to-purple-50">
        <h2 className="text-xl font-bold mb-3 text-gray-900">{t('help.footer.title')}</h2>
        <p className="text-gray-700 mb-4">
          {t('help.footer.description')}
        </p>
        <a
          href="mailto:nyonnguyen@gmail.com"
          className="btn-primary inline-flex items-center gap-2"
        >
          <HelpCircle className="w-4 h-4" />
          {t('help.footer.contactSupport')}
        </a>
      </div>
    </div>
  );
}
