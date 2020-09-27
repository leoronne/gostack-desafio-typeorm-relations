import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exist.');
    }

    const productIds = products.map(product => ({ id: product.id }));
    const requiredProducts = await this.productsRepository.findAllById(
      productIds,
    );

    const orderProducts = products.map(product => {
      const productInfo = requiredProducts.find(
        findProduct => findProduct.id === product.id,
      );

      if (!productInfo) {
        throw new AppError(`Product with ID '${product.id}' does not exist.`);
      }

      if (product.quantity > productInfo.quantity) {
        throw new AppError(
          `Product with ID '${product.id}' has insufficient quantity.`,
        );
      }

      return {
        product_id: product.id,
        quantity: product.quantity,
        price: productInfo.price,

        updatedQuantity: productInfo.quantity - product.quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    const productsWithUpdatedQuantities = orderProducts.map(orderProduct => ({
      id: orderProduct.product_id,
      quantity: orderProduct.updatedQuantity,
    }));

    await this.productsRepository.updateQuantity(productsWithUpdatedQuantities);

    return order;
  }
}

export default CreateOrderService;
