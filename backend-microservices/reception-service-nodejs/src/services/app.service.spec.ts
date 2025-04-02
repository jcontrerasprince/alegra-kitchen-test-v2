import { AppService } from "./app.service";
import { Order } from "../entities/Order";
import { Repository } from "typeorm";
import { RabbitMQProducer } from "../rabbitmq/producers/rabbitmq.producer";

jest.mock("../rabbitmq/producers/rabbitmq.producer"); // Mock de RabbitMQProducer

jest.mock("typeorm", () => {
  const actual = jest.requireActual("typeorm");
  return {
    ...actual,
    DataSource: jest.fn().mockImplementation(() => ({
      getRepository: jest.fn().mockReturnValue({
        findBy: jest.fn().mockResolvedValue([]),
        find: jest.fn().mockResolvedValue([]),
        save: jest.fn().mockResolvedValue({ id: 1, orderId: "test-order" }),
        update: jest.fn(),
        delete: jest.fn(),
      }),
    })),
    In: jest.fn(),
    MoreThanOrEqual: jest.fn(),
  };
});

describe("AppService", () => {
  let appService: AppService;
  let orderRepository: Repository<Order>;

  beforeEach(() => {
    const mockDataSource = new (jest.requireMock("typeorm").DataSource)();
    orderRepository = mockDataSource.getRepository();

    appService = new AppService();
    (appService as any).orderRepository = orderRepository; // Inyectamos el mock
  });

  it("debe crear una orden si hay menos de 20 en los últimos 30 minutos", async () => {
    (orderRepository.findBy as jest.Mock).mockResolvedValue([]); // Simula que no hay órdenes recientes
    (orderRepository.save as jest.Mock).mockResolvedValue({
      orderId: "order_1",
    });

    const result = await appService.createOrder();

    expect(orderRepository.findBy).toHaveBeenCalled();
    expect(orderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PENDING" })
    );
    expect(RabbitMQProducer.emitEvent).toHaveBeenCalledWith(
      "kitchen",
      expect.any(Object)
    ); // Verifica el evento RabbitMQ
    expect(result).toHaveProperty("orderId"); // Debe devolver una orden
  });

  it("debe lanzar un error si hay más de 20 órdenes en los últimos 30 minutos", async () => {
    const fakeOrders = new Array(21).fill({}); // Simula más de 20 órdenes
    (orderRepository.findBy as jest.Mock).mockResolvedValue(fakeOrders);

    await expect(appService.createOrder()).rejects.toThrow(
      "Too many orders in too little time"
    );
  });

  it("debería incrementar qty cuando una comida ya existe en orderMeals", async () => {
    const appService = new AppService();

    jest.spyOn(global.Math, "random").mockReturnValue(0.5);

    const order = await appService.createOrder();

    expect(order.meals.length).toBe(1);
    expect(order.meals[0].qty).toBeGreaterThan(1);
  });

  it("debe retornar las órdenes en estado PENDING, IN PROGRESS o COMPLETED recientes", async () => {
    const fakeOrders = [
      { orderId: "order_1", status: "PENDING" },
      { orderId: "order_2", status: "IN PROGRESS" },
      { orderId: "order_3", status: "COMPLETED" },
    ];
    (orderRepository.find as jest.Mock).mockResolvedValue(fakeOrders);

    const result = await appService.getOrders();

    expect(orderRepository.find).toHaveBeenCalled();
    expect(result).toEqual(fakeOrders);
  });

  it("debe actualizar una orden y enviar el evento a RabbitMQ", async () => {
    (orderRepository.update as jest.Mock).mockResolvedValue({ affected: 1 });

    const order = { orderId: "order_1", status: "COMPLETED" };
    await appService.updateOrder(order);

    expect(RabbitMQProducer.emitEvent).toHaveBeenCalledWith(
      "api-gateway",
      expect.any(Object)
    );
    expect(orderRepository.update).toHaveBeenCalledWith(
      { orderId: order.orderId },
      { status: order.status }
    );
  });

  it("debe reenviar órdenes pendientes a RabbitMQ", async () => {
    const pendingOrders = [{ orderId: "order_1" }, { orderId: "order_2" }];
    (orderRepository.findBy as jest.Mock).mockResolvedValue(pendingOrders);

    await appService.retryPendingOrders();

    expect(RabbitMQProducer.emitEvent).toHaveBeenCalledWith("kitchen", {
      pattern: "retry_pending_orders",
      data: pendingOrders,
    });
  });

  it("debe eliminar todas las entidades de la entidad Orden en la base de datos", async () => {
    (orderRepository.delete as jest.Mock).mockResolvedValue({
      raw: "",
      affected: 100,
    });

    await appService.resetOrders();

    expect(orderRepository.delete).toHaveBeenCalled();
  });
});
