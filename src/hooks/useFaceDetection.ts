import { useEffect, useRef, useState, useCallback } from "react";
import { FaceDetection } from "@mediapipe/face_detection";
import { Camera } from "@mediapipe/camera_utils";

export const useFaceDetection = (onResult: (present: boolean, faces: any[]) => void) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let camera: Camera | null = null;
    const faceDetection = new FaceDetection({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
      },
    });

    faceDetection.setOptions({
      model: "short",
      minDetectionConfidence: 0.5,
    });

    faceDetection.onResults((results) => {
      const present = results.detections.length > 0;
      onResult(present, results.detections);

      if (canvasRef.current && videoRef.current) {
        const canvasCtx = canvasRef.current.getContext("2d");
        if (canvasCtx) {
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Draw detections if needed
          for (const detection of results.detections) {
            const bbox = detection.boundingBox;
            if (bbox) {
              canvasCtx.strokeStyle = "#00FF00";
              canvasCtx.lineWidth = 2;
              canvasCtx.strokeRect(
                bbox.xCenter * canvasRef.current.width - (bbox.width * canvasRef.current.width) / 2,
                bbox.yCenter * canvasRef.current.height - (bbox.height * canvasRef.current.height) / 2,
                bbox.width * canvasRef.current.width,
                bbox.height * canvasRef.current.height
              );
            }
          }
          canvasCtx.restore();
        }
      }
    });

    if (videoRef.current) {
      camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await faceDetection.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });
      camera.start()
        .then(() => setIsReady(true))
        .catch((err) => setError(err.message));
    }

    return () => {
      camera?.stop();
      faceDetection.close();
    };
  }, [onResult]);

  return { videoRef, canvasRef, isReady, error };
};
