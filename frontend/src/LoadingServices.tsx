import {
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { useQueries } from "@tanstack/react-query";
import axios from "axios";

const RECEPTION_SERVICE_HC = import.meta.env.VITE_RECEPTION_SERVICE_HC;
const KITCHEN_SERVICE_HC = import.meta.env.VITE_KITCHEN_SERVICE_HC;
const STORAGE_SERVICE_HC = import.meta.env.VITE_STORAGE_SERVICE_HC;

const paths = [RECEPTION_SERVICE_HC, KITCHEN_SERVICE_HC, STORAGE_SERVICE_HC];

const axiosInstance = axios.create({
  timeout: 120000, // 120,000 ms = 2 minutos
});

const getHealthCheck = async (path: string) => {
  try {
    const { data } = await axiosInstance.get(STORAGE_SERVICE_HC);
    return { path, status: "ok", message: data?.mensaje || "OK" };
  } catch (error) {
    return { path, status: "error", message: "No disponible" };
  }
};

const LoadingServices = () => {
  const results = useQueries({
    queries: paths.map((path) => ({
      queryKey: ["health", path],
      queryFn: () => getHealthCheck(path),
      staleTime: 5000, // Refrescar cada 5 segundos
      // refetchInterval: 5000,
    })),
  });

  return (
    <Box>
      <List dense={true}>
        {results.map(({ data, isLoading }, index) => (
          <ListItem key={index}>
            {isLoading ? (
              <CircularProgress size={20} />
            ) : (
              <ListItemText
                primary={data?.path}
                secondary={data?.status === "ok" ? "🟢 OK" : "🔴 No disponible"}
              />
            )}
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default LoadingServices;
