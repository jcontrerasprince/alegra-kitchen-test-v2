import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { useMutation, useQueries } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const RECEPTION_SERVICE_HC = import.meta.env.VITE_RECEPTION_SERVICE_HC;
const KITCHEN_SERVICE_HC = import.meta.env.VITE_KITCHEN_SERVICE_HC;
const STORAGE_SERVICE_HC = import.meta.env.VITE_STORAGE_SERVICE_HC;

const paths = [
  { url: RECEPTION_SERVICE_HC, serviceId: "srv-cvevs9dumphs73eplnd0" },
  { url: KITCHEN_SERVICE_HC, serviceId: "srv-cvevtj9c1ekc73c067e0" },
  { url: STORAGE_SERVICE_HC, serviceId: "srv-cvevu2t2ng1s73d09ps0" },
];

const axiosInstance = axios.create({
  timeout: 120000, // 120,000 ms = 2 minutos
});

const getHealthCheck = async (path: string) => {
  try {
    const { data } = await axiosInstance.get(path);
    return { path, status: "ok", message: data?.mensaje || "OK" };
  } catch (error) {
    return { path, status: "error", message: "No disponible" };
  }
};

const triggerRedeploy = async (serviceId: string) => {
  try {
    const response = await axiosInstance.post(
      `${BACKEND_URL}/redeploy_render_services`,
      {
        service: serviceId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error al hacer redeploy:", error);
    throw error;
  }
};

const LoadingServices = () => {
  const [redeployingService, setRedeployingService] = useState<string | null>(
    null
  );
  const [redeployedServices, setRedeployedServices] = useState<Set<string>>(
    new Set()
  );

  const mutation = useMutation({
    mutationFn: triggerRedeploy,
    onSuccess: (_data, serviceId) => {
      alert("Redeploy iniciado exitosamente");
      setRedeployedServices((prev) => new Set(prev).add(serviceId));
    },
    onError: (_error) => {
      alert("Error al hacer redeploy");
    },
    onSettled: () => {
      setRedeployingService(null);
    },
  });

  const results = useQueries({
    queries: paths.map((path) => ({
      queryKey: ["health", path],
      queryFn: () => getHealthCheck(path.url),
      staleTime: 5000, // Refrescar cada 5 segundos
      // refetchInterval: 5000,
    })),
  });

  return (
    <Box>
      <List dense={true}>
        {results.map(({ data, isLoading }, index) => {
          const service = paths[index];
          const isError = data?.status === "error";

          return (
            <ListItem key={index} divider sx={{ gap: "10px" }}>
              <ListItemText
                primary={data?.path}
                secondary={
                  isLoading ? (
                    <CircularProgress size={14} />
                  ) : isError ? (
                    "🔴 No disponible"
                  ) : (
                    "🟢 OK"
                  )
                }
              />

              {isError && (
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  disabled={
                    (mutation.isPending &&
                      redeployingService === service.serviceId) ||
                    redeployedServices.has(service.serviceId)
                  }
                  onClick={() => {
                    setRedeployingService(service.serviceId);
                    mutation.mutate(service.serviceId);
                  }}
                >
                  {redeployingService === service.serviceId &&
                  mutation.isPending
                    ? "Reiniciando..."
                    : redeployedServices.has(service.serviceId)
                      ? "Listo"
                      : "Reintentar"}
                </Button>
              )}
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};

export default LoadingServices;
