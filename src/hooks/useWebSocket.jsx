import { useEffect, useState } from "react";

const useWebSocket = (url) => {
  const [stockUpdates, setStockUpdates] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      setStockUpdates((prev) => [...prev, event.data]);
    };

    return () => ws.close();
  }, [url]);

  return stockUpdates;
};

export default useWebSocket;
