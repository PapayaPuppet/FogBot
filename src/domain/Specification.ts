
export interface Specification<T> {
    isSatisfiedBy(candidate: T): boolean;
  
    and(spec: Specification<T>): Specification<T>;
    or(spec: Specification<T>): Specification<T>;
    not(): Specification<T>;
}
  

export abstract class CompositeSpecification<T> implements Specification<T> {
    public abstract isSatisfiedBy(candidate: T): boolean;
  
    public and(spec: Specification<T>): Specification<T> {
        return new AndSpecification<T>(this, spec);
    }
  
    public or(spec: Specification<T>): Specification<T> {
        return new OrSpecification<T>(this, spec);
    }
  
    public not(): Specification<T> {
        return new NotSpecification<T>(this);
    }
}
  
class AndSpecification<T> extends CompositeSpecification<T> {
    constructor(
        private left: Specification<T>,
        private right: Specification<T>
    ) {
        super();
    }
  
    public isSatisfiedBy(candidate: T): boolean {
        return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
    }
}
  
class OrSpecification<T> extends CompositeSpecification<T> {
    constructor(
        private left: Specification<T>,
        private right: Specification<T>
    ) {
        super();
    }
  
    public isSatisfiedBy(candidate: T): boolean {
        return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
    }
}
  
class NotSpecification<T> extends CompositeSpecification<T> {
    constructor(private spec: Specification<T>) {
        super();
    }
  
    public isSatisfiedBy(candidate: T): boolean {
        return !this.spec.isSatisfiedBy(candidate);
    }
}
