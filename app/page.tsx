'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import mermaid from 'mermaid';
import { toPng, toSvg } from 'html-to-image';
import {
  Download,
  Copy,
  FileText,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Save,
  Trash2,
  AlertCircle,
  Monitor,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

// Sample mermaid templates
const templates = {
  flowchart: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E`,
  sequence: `sequenceDiagram
    participant User
    participant API
    participant Database
    User->>API: Request Data
    API->>Database: Query
    Database-->>API: Result
    API-->>User: Response`,
  class: `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }`,
  gantt: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
    Research           :a1, 2024-01-01, 30d
    Design            :a2, after a1, 20d
    section Development
    Frontend          :2024-02-20, 40d
    Backend           :2024-02-25, 35d`,
  erDiagram: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string custNumber
        string sector
    }
    ORDER {
        int orderNumber
        string deliveryAddress
    }`,
  pie: `pie title Sales Distribution
    "Electronics" : 386
    "Clothing" : 234
    "Food" : 145
    "Books" : 78`,
};

type MermaidTheme = 'default' | 'dark' | 'forest' | 'neutral' | 'base';

export default function MermaidEditor() {
  const [code, setCode] = useState(templates.flowchart);
  const [mermaidTheme, setMermaidTheme] = useState<MermaidTheme>('default');
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [savedDiagrams, setSavedDiagrams] = useState<Array<{ name: string; code: string }>>([]);
  const [mounted, setMounted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [editorWidth, setEditorWidth] = useState(50); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  
  const { theme, setTheme, systemTheme } = useTheme();
  const diagramRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (isDark && mermaidTheme === 'default') {
        setMermaidTheme('dark');
      } else if (!isDark && mermaidTheme === 'dark') {
        setMermaidTheme('default');
      }
    }
  }, [isDark, mounted]);

  useEffect(() => {
    if (!mounted) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif',
      themeVariables: {
        ...(mermaidTheme === 'dark' && {
          darkMode: true,
          background: '#1e293b',
          primaryColor: '#3b82f6',
          primaryTextColor: '#f1f5f9',
          primaryBorderColor: '#64748b',
          lineColor: '#94a3b8',
          secondaryColor: '#1e40af',
          tertiaryColor: '#0f172a',
          edgeLabelBackground: '#334155',
          nodeTextColor: '#f1f5f9',
          mainBkg: '#334155',
          textColor: '#f1f5f9',
        }),
        ...(mermaidTheme === 'default' && {
          darkMode: false,
          primaryColor: '#3b82f6',
          primaryTextColor: '#1e293b',
          primaryBorderColor: '#94a3b8',
          lineColor: '#475569',
          edgeLabelBackground: '#ffffff',
          textColor: '#1e293b',
        }),
      },
      flowchart: { 
        curve: 'basis',
        htmlLabels: true,
      },
      sequence: {
        actorMargin: 50,
        useMaxWidth: true,
      },
    });
  }, [mermaidTheme, mounted]);

  const renderDiagram = useCallback(async () => {
    if (!diagramRef.current || !code.trim() || !mounted) return;

    try {
      setError('');
      const id = `mermaid-diagram-${idCounter.current++}`;
      const { svg } = await mermaid.render(id, code);
      diagramRef.current.innerHTML = svg;
      
      const svgElement = diagramRef.current.querySelector('svg');
      if (svgElement) {
        svgElement.style.maxWidth = '100%';
        svgElement.style.height = 'auto';
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid Mermaid syntax');
      console.error('Mermaid render error:', err);
    }
  }, [code, mounted]);

  useEffect(() => {
    const timer = setTimeout(() => {
      renderDiagram();
    }, 500);
    return () => clearTimeout(timer);
  }, [code, mermaidTheme, renderDiagram]);

  useEffect(() => {
    if (!mounted) return;
    const saved = localStorage.getItem('mermaid-diagrams');
    if (saved) {
      try {
        setSavedDiagrams(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved diagrams');
      }
    }
  }, [mounted]);

  // Fullscreen functionality [web:21][web:23]
  const toggleFullscreen = useCallback(async () => {
    if (!previewContainerRef.current) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (previewContainerRef.current.requestFullscreen) {
          await previewContainerRef.current.requestFullscreen();
        } else if ((previewContainerRef.current as any).webkitRequestFullscreen) {
          await (previewContainerRef.current as any).webkitRequestFullscreen();
        } else if ((previewContainerRef.current as any).mozRequestFullScreen) {
          await (previewContainerRef.current as any).mozRequestFullScreen();
        } else if ((previewContainerRef.current as any).msRequestFullscreen) {
          await (previewContainerRef.current as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes [web:23]
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Resizable pane functionality [web:26]
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Constrain between 20% and 80%
      const constrainedWidth = Math.min(Math.max(newWidth, 20), 80);
      setEditorWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const exportToPNG = async () => {
    if (!diagramRef.current) return;
    try {
      const dataUrl = await toPng(diagramRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
      });
      const link = document.createElement('a');
      link.download = 'mermaid-diagram.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export to PNG failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  const exportToSVG = async () => {
    if (!diagramRef.current) return;
    try {
      const dataUrl = await toSvg(diagramRef.current, {
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
      });
      const link = document.createElement('a');
      link.download = 'mermaid-diagram.svg';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export to SVG failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      alert('Code copied to clipboard!');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const saveDiagram = () => {
    const name = prompt('Enter diagram name:');
    if (!name) return;
    
    const newDiagrams = [...savedDiagrams, { name, code }];
    setSavedDiagrams(newDiagrams);
    localStorage.setItem('mermaid-diagrams', JSON.stringify(newDiagrams));
  };

  const deleteDiagram = (index: number) => {
    if (!confirm('Delete this diagram?')) return;
    const newDiagrams = savedDiagrams.filter((_, i) => i !== index);
    setSavedDiagrams(newDiagrams);
    localStorage.setItem('mermaid-diagrams', JSON.stringify(newDiagrams));
  };

  const loadDiagram = (diagramCode: string) => {
    setCode(diagramCode);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));

  if (!mounted) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-md border-b border-slate-200 dark:border-slate-700 transition-colors">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Mermaid Chart Studio
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title={showSidebar ? 'Hide Templates' : 'Show Templates'}
            >
              {showSidebar ? (
                <PanelLeftClose className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              ) : (
                <PanelLeftOpen className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              )}
            </button>

            {/* UI Theme Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <button
                onClick={() => setTheme('light')}
                className={`p-2 rounded-md transition ${
                  theme === 'light'
                    ? 'bg-white dark:bg-slate-600 shadow-sm'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
                title="Light Mode"
              >
                <Sun className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-2 rounded-md transition ${
                  theme === 'system'
                    ? 'bg-white dark:bg-slate-600 shadow-sm'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
                title="System Theme"
              >
                <Monitor className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-2 rounded-md transition ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-slate-600 shadow-sm'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
                title="Dark Mode"
              >
                <Moon className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </button>
            </div>

            {/* Mermaid Diagram Theme Selector */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <Palette className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <select
                value={mermaidTheme}
                onChange={(e) => setMermaidTheme(e.target.value as MermaidTheme)}
                className="bg-transparent text-sm text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                <option value="default">Default</option>
                <option value="dark">Dark</option>
                <option value="forest">Forest</option>
                <option value="neutral">Neutral</option>
                <option value="base">Base</option>
              </select>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg px-2">
              <button
                onClick={handleZoomOut}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </button>
              <span className="text-sm font-medium px-2 min-w-[50px] text-center text-slate-700 dark:text-slate-200">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </button>
            </div>

            {/* Export Buttons */}
            <button
              onClick={exportToPNG}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              PNG
            </button>
            <button
              onClick={exportToSVG}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              SVG
            </button>
            
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="Copy Code"
            >
              <Copy className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
            
            <button
              onClick={saveDiagram}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="Save Diagram"
            >
              <Save className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Templates & Saved */}
        {showSidebar && (
          <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto transition-colors">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-3 text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Templates
              </h2>
              <div className="space-y-2">
                {Object.entries(templates).map(([name, template]) => (
                  <button
                    key={name}
                    onClick={() => setCode(template)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-sm capitalize transition text-slate-700 dark:text-slate-200"
                  >
                    {name.replace(/([A-Z])/g, ' $1').trim()}
                  </button>
                ))}
              </div>

              {savedDiagrams.length > 0 && (
                <>
                  <h2 className="text-lg font-semibold mt-6 mb-3 text-slate-800 dark:text-white flex items-center gap-2">
                    <Save className="w-5 h-5" />
                    Saved Diagrams
                  </h2>
                  <div className="space-y-2">
                    {savedDiagrams.map((diagram, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between group"
                      >
                        <button
                          onClick={() => loadDiagram(diagram.code)}
                          className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-sm transition truncate text-slate-700 dark:text-slate-200"
                        >
                          {diagram.name}
                        </button>
                        <button
                          onClick={() => deleteDiagram(idx)}
                          className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </aside>
        )}

        {/* Editor & Preview - Resizable */}
        <div ref={containerRef} className="flex-1 flex flex-col lg:flex-row relative">
          {/* Code Editor */}
          <div 
            className="flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors relative"
            style={{ width: `${editorWidth}%` }}
          >
            <div className="px-4 py-3 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 transition-colors">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                Mermaid Code
              </h3>
            </div>
            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 p-4 font-mono text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 resize-none focus:outline-none transition-colors"
              placeholder="Enter your Mermaid code here..."
              spellCheck={false}
            />
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400 transition-colors">
              Lines: {code.split('\n').length} | Characters: {code.length}
            </div>

            {/* Resize Handle */}
            <div
              className={`absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors ${
                isResizing ? 'bg-blue-500' : 'bg-transparent'
              }`}
              onMouseDown={handleMouseDown}
              title="Drag to resize"
            />
          </div>

          {/* Preview Panel */}
          <div 
            className="flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors"
            style={{ width: `${100 - editorWidth}%` }}
            ref={previewContainerRef}
          >
            <div className="px-4 py-3 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex justify-between items-center transition-colors">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                Preview
              </h3>
              <button
                onClick={toggleFullscreen}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center gap-2"
                title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                )}
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
              {error ? (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              ) : (
                <div
                  ref={diagramRef}
                  style={{ transform: `scale(${zoom / 100})` }}
                  className="transition-transform origin-center"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
