import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Ingredient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  ingredientName: string;

  @Column({ type: 'int' })
  qtyAvailable: number;

  @Column({ type: 'int' })
  qtyLock: number;

  @Column({ type: 'jsonb' })
  preparationIds: Array<string>;
}
