import { Bug, Github, AlertCircle, MessageSquare, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function BugReport() {
  const { t } = useTranslation();

  const issueTemplate = `**Bug Description:**
[A clear and concise description of the bug]

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior:**
[What you expected to happen]

**Actual Behavior:**
[What actually happened]

**Environment:**
- Server Version: ${window.location.hostname}
- Browser: [e.g., Chrome 120, Firefox 115]
- OS: [e.g., Ubuntu 22.04, Windows 11]

**Screenshots:**
[If applicable, add screenshots to help explain your problem]

**Additional Context:**
[Add any other context about the problem here]`;

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(issueTemplate);
    alert('Bug report template copied to clipboard!');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-lg shadow-lg p-8 text-white mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Bug className="w-16 h-16" />
          <div>
            <h1 className="text-3xl font-bold">Report a Bug or Issue</h1>
            <p className="text-red-100 text-lg">Help us improve by reporting problems you encounter</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <a
          href="https://github.com/nyonnguyen/livestream-server/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          className="card hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200"
        >
          <div className="flex items-start gap-4">
            <div className="bg-blue-600 text-white p-3 rounded-lg">
              <Github className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                Create New Issue on GitHub
                <ExternalLink className="w-4 h-4" />
              </h2>
              <p className="text-gray-700 text-sm">
                Submit a bug report or feature request directly on our GitHub repository.
                Fastest way to get your issue tracked and resolved.
              </p>
            </div>
          </div>
        </a>

        <a
          href="https://github.com/nyonnguyen/livestream-server/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="card hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200"
        >
          <div className="flex items-start gap-4">
            <div className="bg-green-600 text-white p-3 rounded-lg">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                View Existing Issues
                <ExternalLink className="w-4 h-4" />
              </h2>
              <p className="text-gray-700 text-sm">
                Check if your issue has already been reported or find solutions to common problems.
              </p>
            </div>
          </div>
        </a>
      </div>

      {/* How to Report */}
      <div className="card mb-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-blue-600" />
          How to Report a Bug
        </h2>
        <div className="space-y-4 text-gray-700">
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Before Submitting:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              <li>Search existing issues to avoid duplicates</li>
              <li>Make sure you're using the latest version</li>
              <li>Gather as much information as possible about the issue</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">What to Include in Your Bug Report:</h3>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                <strong>Clear Description:</strong> Explain what happened and what you expected to happen
              </li>
              <li>
                <strong>Steps to Reproduce:</strong> Provide detailed steps so we can recreate the issue
              </li>
              <li>
                <strong>Environment Details:</strong> Server version, browser, operating system
              </li>
              <li>
                <strong>Screenshots/Logs:</strong> Visual evidence or error logs if available
              </li>
              <li>
                <strong>Impact:</strong> How severe is the issue? Does it block your work?
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Bug Report Template */}
      <div className="card mb-6">
        <h2 className="text-2xl font-bold mb-4">Bug Report Template</h2>
        <p className="text-gray-700 mb-4">
          Use this template to structure your bug report. Click the button below to copy it to your clipboard.
        </p>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto mb-4">
          <pre className="whitespace-pre-wrap">{issueTemplate}</pre>
        </div>
        <button
          onClick={handleCopyTemplate}
          className="btn-primary flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          Copy Template to Clipboard
        </button>
      </div>

      {/* Issue Categories */}
      <div className="card mb-6">
        <h2 className="text-2xl font-bold mb-4">Issue Categories</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Bug Report
            </h3>
            <p className="text-sm text-red-800">
              Something isn't working as expected or causes errors
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Feature Request
            </h3>
            <p className="text-sm text-blue-800">
              Suggest a new feature or improvement to existing functionality
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Question/Help
            </h3>
            <p className="text-sm text-yellow-800">
              Need help with setup, configuration, or usage
            </p>
          </div>
        </div>
      </div>

      {/* Alternative Contact */}
      <div className="card bg-gray-50">
        <h2 className="text-xl font-bold mb-3">Alternative Contact Methods</h2>
        <p className="text-gray-700 mb-4">
          If you prefer not to use GitHub, you can also reach out via:
        </p>
        <div className="space-y-2 text-gray-700">
          <p>
            <strong>Email:</strong>{' '}
            <a
              href="mailto:nyonnguyen@gmail.com"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              nyonnguyen@gmail.com
            </a>
          </p>
          <p className="text-sm text-gray-600 italic">
            For security vulnerabilities, please report via email instead of public GitHub issues.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm mt-8 pb-8">
        <p>Thank you for helping improve Livestream Server!</p>
        <p className="mt-1">Your feedback makes this project better for everyone.</p>
      </div>
    </div>
  );
}
