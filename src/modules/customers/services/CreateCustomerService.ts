import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import Customer from '../infra/typeorm/entities/Customer';
import ICustomersRepository from '../repositories/ICustomersRepository';

interface IRequest {
  name: string;
  email: string;
}

@injectable()
class CreateCustomerService {
  constructor(
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ name, email }: IRequest): Promise<Customer> {
    const isEmailInUse = await this.customersRepository.findByEmail(email);

    if (isEmailInUse) {
      throw new AppError('E-mail is already in use.');
    }

    const user = await this.customersRepository.create({
      name,
      email,
    });

    return user;
  }
}

export default CreateCustomerService;
