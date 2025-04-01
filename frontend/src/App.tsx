import {
  Container,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Typography,
  Snackbar,
  Alert,
  Box,
  Chip,
  Card,
  CardContent,
  Divider,
  List,
  ListItemText,
  ListItem,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import LoadingServices from "./LoadingServices";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const socket = io(BACKEND_URL);

const fetchOrders = async () => {
  const { data } = await axios.get(`${BACKEND_URL}/orders`);
  return data;
};

const fetchIngredients = async () => {
  const { data } = await axios.get(`${BACKEND_URL}/storage`);
  return data;
};

const fetchPurchasedIngredients = async () => {
  const { data } = await axios.get(`${BACKEND_URL}/shopping_history`);
  return data;
};

const fetchMeals = async () => {
  const { data } = await axios.get(`${BACKEND_URL}/meals`);
  return data;
};

const fetchPreparations = async () => {
  const { data } = await axios.get(`${BACKEND_URL}/preparations`);
  return data;
};

const createOrder = async () => {
  const nuevaOrden = {};
  const { data } = await axios.post(`${BACKEND_URL}/create_order`, nuevaOrden);
  return data;
};

const resetIngredients = async () => {
  await axios.post(`${BACKEND_URL}/reset_ingredients`);
};

const resetOrdersAndPreparations = async () => {
  await axios.post(`${BACKEND_URL}/reset_orders_and_preparations`);
};

const App = () => {
  const queryClient = useQueryClient();
  const [snackbars, setSnackbars] = useState<
    { message: string; severity: "success" | "error"; key: number }[]
  >([]);

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbars((prev) => [
      ...prev,
      { message, severity, key: new Date().getTime() }, // Genera un key único
    ]);
  };

  const {
    data: orders,
    isLoading: isLoadingOrders,
    error: errorOrders,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const { data: ingredients } = useQuery({
    queryKey: ["storage"],
    queryFn: fetchIngredients,
  });

  const { data: purchasedIngredients } = useQuery({
    queryKey: ["purchasedIngredients"],
    queryFn: fetchPurchasedIngredients,
  });

  const { data: meals } = useQuery({
    queryKey: ["meals"],
    queryFn: fetchMeals,
  });

  const { data: preparations } = useQuery({
    queryKey: ["preparations"],
    queryFn: fetchPreparations,
  });

  const ordersMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (data) => {
      showSnackbar(`Orden creada: ${data.orderId}`, "success");
      queryClient.invalidateQueries({
        queryKey: ["orders"],
      });
      queryClient.invalidateQueries({
        queryKey: ["preparations"],
      });
    },
    onError: () => {
      showSnackbar("Error al crear la orden", "error");
    },
  });

  const resetIngredientsMutation = useMutation({
    mutationFn: resetIngredients,
    onSuccess: async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      showSnackbar("Ingredientes reiniciados", "success");
      queryClient.invalidateQueries({ queryKey: ["storage"] });
    },
    onError: () => {
      showSnackbar("Error al reiniciar ingredientes", "error");
    },
  });

  const resetOrdersMutation = useMutation({
    mutationFn: resetOrdersAndPreparations,
    onSuccess: async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      showSnackbar("Órdenes y preparaciones reiniciadas", "success");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["preparations"] });
    },
    onError: () => {
      showSnackbar("Error al reiniciar órdenes y preparaciones", "error");
    },
  });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event;
      const width = window.innerWidth;
      const height = window.innerHeight;

      const hue = Math.floor(200 + (clientX / width) * 50);

      const lightness = Math.floor(70 - (clientY / height) * 10);

      document.documentElement.style.setProperty(
        "--bg-color",
        `hsl(${hue}, 80%, ${lightness}%)`
      );
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    socket.on("orderUpdated", (updatedOrder: any) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["preparations"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
      queryClient.invalidateQueries({ queryKey: ["purchasedIngredients"] });
      showSnackbar(
        `Orden actualizada: ${updatedOrder.orderId}: ${updatedOrder.status}`,
        "success"
      );
    });

    return () => {
      socket.off("orderUpdated");
    };
  }, []);

  return (
    <Container
      maxWidth="lg"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: "50px",
      }}
    >
      <Typography variant="h3" component="h1">
        Bienvenidos a mi prueba técnica
      </Typography>
      <Typography variant="h4">Backend URL: {BACKEND_URL}</Typography>
      <Box sx={{ display: "flex", flexDirection: "row" }}>
        <Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <Button
              variant="contained"
              color="primary"
              sx={{ m: 2 }}
              disabled={ordersMutation.isPending}
              onClick={() => ordersMutation.mutate()}
            >
              Nueva Orden
            </Button>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <Button
              variant="contained"
              color="secondary"
              sx={{ m: 2 }}
              disabled={resetIngredientsMutation.isPending}
              onClick={() => resetIngredientsMutation.mutate()}
            >
              Reiniciar ingredientes
            </Button>
            <Button
              variant="contained"
              color="secondary"
              sx={{ m: 2 }}
              disabled={resetOrdersMutation.isPending}
              onClick={() => resetOrdersMutation.mutate()}
            >
              Reiniciar órdenes y preparaciones
            </Button>
          </Box>
        </Box>
        <LoadingServices />
      </Box>

      {isLoadingOrders && (
        <Typography variant="body1">Cargando órdenes...</Typography>
      )}
      {errorOrders && (
        <Typography variant="body1">Error al cargar órdenes</Typography>
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          p: 1,
          m: 1,
          gap: "10px",
          alignItems: "self-start",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <Paper elevation={3} style={{ padding: "20px" }}>
            <Typography variant="h5" component="h2">
              Historial de órdenes
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <b>Id de la orden</b>
                  </TableCell>
                  <TableCell>
                    <b>Platos (cantidad)</b>
                  </TableCell>
                  <TableCell>
                    <b>Status</b>
                  </TableCell>
                  <TableCell>
                    <b>Fecha/hora de creado</b>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders?.map((order: Record<string, any>, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{order.orderId}</TableCell>
                    <TableCell>
                      {order.meals
                        .map((meal: any) => `${meal.mealName} (${meal.qty})`)
                        .join(", ")}
                    </TableCell>
                    <TableCell>
                      <Chip
                        color={
                          order.status === "COMPLETED" ? "success" : "warning"
                        }
                        label={order.status}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          <Paper elevation={3} style={{ padding: "20px" }}>
            <Typography variant="h5" component="h2">
              Historial de pedidos a cocina (<i>preparations</i>)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <b>Id de la preparación</b>
                  </TableCell>
                  <TableCell>
                    <b>Nombre del plato</b>
                  </TableCell>
                  <TableCell>
                    <b>Status</b>
                  </TableCell>
                  <TableCell>
                    <b>Orden Id</b>
                  </TableCell>
                  <TableCell>
                    <b>Fecha/hora de solicitud</b>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preparations?.map(
                  (meal: Record<string, any>, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{meal.id}</TableCell>
                      <TableCell>{meal.mealName}</TableCell>
                      <TableCell>{meal.orderId}</TableCell>
                      <TableCell>
                        <Chip
                          color={
                            meal.status === "COMPLETED" ? "success" : "warning"
                          }
                          label={meal.status}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(meal.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "start" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            p: 1,
            m: 1,
            gap: "10px",
          }}
        >
          <Paper elevation={3} style={{ padding: "10px" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <b>Ingrediente almacén</b>
                  </TableCell>
                  <TableCell>
                    <b>Cantidad disponible</b>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ingredients && ingredients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2}>No hay ingredientes</TableCell>
                  </TableRow>
                ) : (
                  ingredients?.map((ingredient: Record<string, any>) => (
                    <TableRow key={ingredient.id}>
                      <TableCell>{ingredient.ingredientName}</TableCell>
                      <TableCell>{ingredient.qtyAvailable}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
          <Paper elevation={3} style={{ padding: "10px" }}>
            <Typography variant="h5" component="h2">
              Últimos 10 ingredientes comprados
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <b>Ingrediente comprado</b>
                  </TableCell>
                  <TableCell>
                    <b>Cantidad</b>
                  </TableCell>
                  <TableCell>
                    <b>Fecha/hora de compra</b>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchasedIngredients && purchasedIngredients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2}>
                      No hay ingredientes comprados
                    </TableCell>
                  </TableRow>
                ) : (
                  purchasedIngredients?.map(
                    (ingredient: Record<string, any>) => (
                      <TableRow key={ingredient.id}>
                        <TableCell>{ingredient.ingredientName}</TableCell>
                        <TableCell>{ingredient.qtyPurchased}</TableCell>
                        <TableCell>
                          {new Date(ingredient.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          </Paper>
          <Divider />
        </Box>
        <Paper elevation={3} sx={{ p: 1, m: 2 }}>
          <Typography variant="h5" component="h2">
            Listado de platos
          </Typography>
          <List dense={true}>
            {meals?.map((meal: Record<string, any>, index: number) => (
              <ListItem key={index}>
                <ListItemText
                  primary={`${meal.mealName}: ${meal.ingredients
                    .map(
                      (ingredient: Record<string, any>) =>
                        `${ingredient.ingredientName} (${ingredient.qty})`
                    )
                    .join(", ")}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "row", p: 1, m: 1 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" component="div">
              Explicación...
            </Typography>
            <Typography variant="body2">
              Esta API se encarga de solicitar un plato de comida al azar de los
              que existen en el menú. Toda esta información se encuentra en el
              backend. Tomar en cuenta se muestran únicamente cualquier orden
              que esté pendiente (no habían ingredientes para la preparación a
              pesar de que se compraron en el "Farm Market") y las completadas
              en los últimos 30 minutos.
            </Typography>
            <Typography variant="body2">
              Los botones de "Reiniciar ingredientes" y "Reiniciar órdenes y
              preparaciones" se encargan de reiniciar el inventario de
              ingredientes y las órdenes y preparaciones, respectivamente.
            </Typography>
          </CardContent>
        </Card>
      </Box>
      {snackbars.map(({ message, severity, key }) => (
        <Snackbar
          key={key}
          open={true}
          autoHideDuration={3000}
          onClose={() =>
            setSnackbars((prev) => prev.filter((s) => s.key !== key))
          }
        >
          <Alert severity={severity}>{message}</Alert>
        </Snackbar>
      ))}
    </Container>
  );
};

export default App;
