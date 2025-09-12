import React, { useRef, useEffect, useState } from 'react';

const AnnotationCanvas = ({ imageUrl, existingAnnotations, onSave, disabled }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('rectangle');
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [annotations, setAnnotations] = useState(existingAnnotations?.shapes || []);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 }); // ✅ This was missing!

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);

      // Calculate canvas size to fit image
      const maxWidth = 800;
      const maxHeight = 600;
      let { width, height } = img;

      // Scale image to fit within max dimensions while maintaining aspect ratio
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      const newCanvasSize = { width: Math.floor(width), height: Math.floor(height) };
      setCanvasSize(newCanvasSize);

      console.log('Image loaded:', {
        original: { width: img.width, height: img.height },
        canvas: newCanvasSize
      });

      // Draw canvas after state is updated
      setTimeout(() => drawCanvas(img, annotations), 100);
    };

    img.onerror = (error) => {
      console.error('Failed to load image:', imageUrl, error);
      alert('Failed to load image. Please try refreshing the page.');
    };

    const apiBaseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    img.src = imageUrl.startsWith('http') ? imageUrl : `${apiBaseUrl}${imageUrl}`;
  }, [imageUrl]);

  useEffect(() => {
    if (image && canvasSize.width > 0) {
      drawCanvas(image, annotations);
    }
  }, [annotations, image, canvasSize]);

  const drawCanvas = (img, shapes = []) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw existing annotations
    shapes.forEach(shape => {
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();

      if (shape.type === 'rectangle') {
        ctx.rect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === 'circle') {
        ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
      } else if (shape.type === 'arrow') {
        // Draw arrow line
        ctx.moveTo(shape.startX, shape.startY);
        ctx.lineTo(shape.endX, shape.endY);

        // Draw arrowhead
        const angle = Math.atan2(shape.endY - shape.startY, shape.endX - shape.startX);
        const headLength = 15;
        ctx.moveTo(shape.endX, shape.endY);
        ctx.lineTo(
          shape.endX - headLength * Math.cos(angle - Math.PI / 6),
          shape.endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(shape.endX, shape.endY);
        ctx.lineTo(
          shape.endX - headLength * Math.cos(angle + Math.PI / 6),
          shape.endY - headLength * Math.sin(angle + Math.PI / 6)
        );
      }

      ctx.stroke();
    });
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Calculate scale factor between displayed size and actual canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    if (disabled) return;

    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);
  };

  const handleMouseUp = (e) => {
    if (!isDrawing || disabled) return;

    const pos = getMousePos(e);
    let newShape = null;

    if (currentTool === 'rectangle') {
      const width = Math.abs(pos.x - startPos.x);
      const height = Math.abs(pos.y - startPos.y);

      if (width > 5 && height > 5) {
        newShape = {
          type: 'rectangle',
          x: Math.min(startPos.x, pos.x),
          y: Math.min(startPos.y, pos.y),
          width: width,
          height: height,
          color: currentColor
        };
      }
    } else if (currentTool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2)
      );

      if (radius > 5) {
        newShape = {
          type: 'circle',
          x: startPos.x,
          y: startPos.y,
          radius: radius,
          color: currentColor
        };
      }
    } else if (currentTool === 'arrow') {
      const distance = Math.sqrt(
        Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2)
      );

      if (distance > 10) {
        newShape = {
          type: 'arrow',
          startX: startPos.x,
          startY: startPos.y,
          endX: pos.x,
          endY: pos.y,
          color: currentColor
        };
      }
    }

    if (newShape) {
      const newAnnotations = [...annotations, newShape];
      setAnnotations(newAnnotations);
      console.log('Added annotation:', newShape);
    }

    setIsDrawing(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;

    // Check if we have annotations and canvas is ready
    if (!canvas || annotations.length === 0) {
      alert('Please add some annotations before saving');
      return;
    }

    // Check if canvasSize is properly set
    if (!canvasSize || canvasSize.width === 0 || canvasSize.height === 0) {
      alert('Canvas is not properly initialized. Please try refreshing the page.');
      return;
    }

    console.log('Saving annotations:', {
      annotationsCount: annotations.length,
      canvasSize: canvasSize,
      canvasDimensions: { width: canvas.width, height: canvas.height }
    });

    // Ensure the canvas is fully rendered with latest annotations
    drawCanvas(image, annotations);

    // Small delay to ensure canvas is rendered
    setTimeout(() => {
      const annotationData = {
        shapes: annotations,
        timestamp: new Date().toISOString(),
        imageSize: canvasSize, // ✅ Now properly defined!
        totalAnnotations: annotations.length
      };

      // Get high-quality canvas data URL
      const annotatedImageDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      console.log('Annotation save details:', {
        shapesCount: annotations.length,
        canvasSize: canvasSize, // ✅ Now properly defined!
        dataUrlLength: annotatedImageDataUrl.length,
        shapes: annotations.map(s => ({ type: s.type, color: s.color }))
      });

      // Verify we have actual image data
      if (annotatedImageDataUrl.length < 1000) {
        alert('Error: Canvas image data seems invalid. Please try drawing some annotations and try again.');
        return;
      }

      // Call the save function
      onSave(annotationData, annotatedImageDataUrl);
    }, 200);
  };

  const handleClear = () => {
    setAnnotations([]);
    console.log('Cleared all annotations');
  };

  const handleUndo = () => {
    if (annotations.length > 0) {
      const newAnnotations = annotations.slice(0, -1);
      setAnnotations(newAnnotations);
      console.log('Removed last annotation, remaining:', newAnnotations.length);
    }
  };

  const tools = [
    { id: 'rectangle', name: 'Rectangle', icon: '⬛' },
    { id: 'circle', name: 'Circle', icon: '⚪' },
    { id: 'arrow', name: 'Arrow', icon: '↗️' }
  ];

  const colors = [
    '#FF0000', // Red
    '#00FF00', // Green  
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF'  // Cyan
  ];

  return (
    <div className="space-y-4">
      {/* Tools and Controls */}
      <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-lg">
        <div className="flex gap-2">
          <span className="text-sm font-medium text-gray-700 self-center">Tools:</span>
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${currentTool === tool.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              disabled={disabled}
            >
              {tool.icon} {tool.name}
            </button>
          ))}
        </div>

        <div className="flex gap-1 items-center">
          <span className="text-sm font-medium text-gray-700 mr-2">Colors:</span>
          {colors.map(color => (
            <button
              key={color}
              onClick={() => setCurrentColor(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${currentColor === color ? 'border-gray-800 scale-110' : 'border-gray-300 hover:scale-105'
                }`}
              style={{ backgroundColor: color }}
              disabled={disabled}
              title={`Select ${color}`}
            />
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleUndo}
            className="btn-secondary text-sm"
            disabled={disabled || annotations.length === 0}
          >
            Undo
          </button>
          <button
            onClick={handleClear}
            className="btn-secondary text-sm"
            disabled={disabled || annotations.length === 0}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Status Info */}
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
        <strong>Status:</strong> {annotations.length} annotation(s) |
        <strong> Tool:</strong> {currentTool} |
        <strong> Color:</strong> <span style={{ color: currentColor }}>{currentColor}</span> |
        <strong> Canvas:</strong> {canvasSize.width}×{canvasSize.height}px
      </div>

      {/* Canvas Container */}
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          className="cursor-crosshair max-w-full block"
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '600px'
          }}
        />
      </div>

      {/* Save Controls */}
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
        <div className="text-sm text-gray-600">
          {annotations.length > 0 ? (
            <span className="text-green-600 font-medium">
              ✓ {annotations.length} annotation(s) ready to save
            </span>
          ) : (
            <span className="text-orange-600">
              ⚠️ No annotations yet. Draw some annotations to enable saving.
            </span>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={disabled || annotations.length === 0}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? 'Saving...' : `Save ${annotations.length} Annotation(s)`}
        </button>
      </div>
    </div>
  );
};

export default AnnotationCanvas;