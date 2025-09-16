import { useState } from "react";
import { FaLinkedin, FaGithub, FaEnvelope } from "react-icons/fa";

export default function App() {
  const [topic, setTopic] = useState("");
  const [subtopics, setSubtopics] = useState([]);
  const [resources, setResources] = useState({});
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);
  const [loadingResources, setLoadingResources] = useState({});

  const generateSubtopics = async () => {
    if (!topic.trim()) return;
    setLoadingSubtopics(true);
    try {
      const resp = await fetch("http://localhost:8000/generate-learning-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: topic }),
      });
      const data = await resp.json();
      setSubtopics(data.subtopics || []);
      setResources({});
    } catch (err) {
      console.error("Error generating subtopics:", err);
    } finally {
      setLoadingSubtopics(false);
    }
  };

  const fetchResources = async (subtopic) => {
    if (resources[subtopic]) {
      setResources((prev) => {
        const copy = { ...prev };
        delete copy[subtopic];
        return copy;
      });
      return;
    }

    setLoadingResources((prev) => ({ ...prev, [subtopic]: true }));

    try {
      const resp = await fetch(
        `http://localhost:8000/resources?subtopic=${encodeURIComponent(subtopic)}`
      );
      const data = await resp.json();
      setResources((prev) => ({ ...prev, [subtopic]: data }));
    } catch (err) {
      console.error("Error fetching resources:", err);
    } finally {
      setLoadingResources((prev) => ({ ...prev, [subtopic]: false }));
    }
  };

  const removeSubtopic = (title) => {
    setSubtopics(subtopics.filter((s) => s.title !== title));
    const newRes = { ...resources };
    delete newRes[title];
    setResources(newRes);
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      generateSubtopics();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-8">
      {/* Search Input Section */}
      <div className={`flex justify-center mb-6 space-x-2 ${subtopics.length > 0 ? 'mt-0' : 'flex-grow items-center'}`}>
        <div className="flex flex-col items-center">
          {subtopics.length === 0 && (
            <h1 className="text-4xl font-bold text-center text-blue-600 mb-8">
              AI Resource Finder
            </h1>
          )}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter a topic (e.g., Artificial Intelligence)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-96 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={generateSubtopics}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center"
              disabled={loadingSubtopics}
            >
              {loadingSubtopics ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent border-b-transparent rounded-full animate-spin"></div>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Subtopics and Resources */}
      {subtopics.length > 0 && (
        <div className="space-y-4 max-w-3xl mx-auto w-full mt-8">
          {subtopics.map((s) => {
            const expanded = !!resources[s.title];
            return (
              <div key={s.title} className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-800">{s.title}</span>
                  <div className="space-x-2 flex">
                    <button
                      onClick={() => fetchResources(s.title)}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
                      disabled={loadingResources[s.title]}
                    >
                      {loadingResources[s.title]
                        ? "Loading..."
                        : expanded
                        ? "Hide Resources"
                        : "Find Resources"}
                    </button>
                    <button
                      onClick={() => removeSubtopic(s.title)}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {expanded && resources[s.title] && (
                  <div className="mt-4 border-t pt-4 space-y-3">
                    {/* MIT OCW */}
                    <div>
                      <h3 className="font-semibold">MIT OCW</h3>
                      {[
                        resources[s.title]?.mit,
                        ...(resources[s.title]?.mit_extra || []),
                      ].map(
                        (mit, idx) =>
                          mit?.link && (
                            <div key={idx}>
                              <a
                                href={
                                  mit.link?.startsWith("http")
                                    ? mit.link
                                    : `https://${mit.link}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                {mit.title}
                              </a>
                            </div>
                          )
                      )}
                    </div>

                    {/* YouTube */}
                    <div>
                      <h3 className="font-semibold mt-2">YouTube</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {resources[s.title]?.youtube?.map((vid, i) => (
                          <a
                            key={i}
                            href={vid.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 hover:bg-gray-100 p-2 rounded"
                          >
                            {vid.thumbnail && (
                              <img
                                src={vid.thumbnail}
                                alt={vid.title}
                                className="w-20 h-16 object-cover rounded"
                              />
                            )}
                            <span className="text-blue-500">{vid.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 text-center text-gray-500">
        <div className="flex justify-center space-x-4">
          <a href="www.linkedin.com/in/shashwat-anand-b96920201" target="_blank" className="hover:text-blue-700">
            <FaLinkedin size={24} />
          </a>
          <a href="https://github.com/ShashwatAnand021?tab=repositories" target="_blank" className="hover:text-gray-900">
            <FaGithub size={24} />
          </a>
          <a href="mailto:shashwatanand021@gmail.com" className="hover:text-red-500">
            <FaEnvelope size={24} />
          </a>
        </div>
        <p className="mt-2">Made with <span className="text-red-500">❤️</span> by Shashwat</p>
      </div>
    </div>
  );
}