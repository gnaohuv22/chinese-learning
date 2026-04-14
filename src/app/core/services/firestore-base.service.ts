import {
  collection,
  doc,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  WhereFilterOp,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { db } from '../firebase';

export interface WhereClause {
  field: string;
  op: WhereFilterOp;
  value: unknown;
}

export class FirestoreBaseService<T extends { id: string }> {
  private convertTimestamps(obj: unknown): unknown {
    if (obj instanceof Timestamp) return obj.toDate();
    if (Array.isArray(obj)) return obj.map((item) => this.convertTimestamps(item));
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
          k,
          this.convertTimestamps(v),
        ])
      );
    }
    return obj;
  }

  protected getCollection(path: string): CollectionReference {
    return collection(db, path);
  }

  protected getDocRef(path: string, id: string): DocumentReference {
    return doc(db, path, id);
  }

  getAll(
    collectionPath: string,
    orderByField?: string,
    whereClauses?: WhereClause[]
  ): Observable<T[]> {
    const ref = collection(db, collectionPath);
    const constraints = [];

    if (whereClauses) {
      for (const clause of whereClauses) {
        constraints.push(where(clause.field, clause.op, clause.value));
      }
    }
    if (orderByField) {
      constraints.push(orderBy(orderByField));
    }

    const q = query(ref, ...constraints);

    return new Observable<T[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((d) =>
            this.convertTimestamps({ id: d.id, ...d.data() })
          ) as T[];
          subscriber.next(items);
        },
        (error) => subscriber.error(error)
      );
      return () => unsubscribe();
    });
  }

  /**
   * One-time read with optional server-side limit — does NOT set up a real-time listener.
   * Use this for collections where live updates are not needed (e.g. news list).
   */
  getOnce(
    collectionPath: string,
    orderByField?: string,
    limitCount?: number,
    whereClauses?: WhereClause[]
  ): Observable<T[]> {
    const ref = collection(db, collectionPath);
    const constraints = [];

    if (whereClauses) {
      for (const clause of whereClauses) {
        constraints.push(where(clause.field, clause.op, clause.value));
      }
    }
    if (orderByField) {
      constraints.push(orderBy(orderByField));
    }
    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    const q = query(ref, ...constraints);

    return new Observable<T[]>((subscriber) => {
      getDocs(q)
        .then((snapshot) => {
          const items = snapshot.docs.map((d) =>
            this.convertTimestamps({ id: d.id, ...d.data() })
          ) as T[];
          subscriber.next(items);
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
    });
  }

  getById(collectionPath: string, id: string): Observable<T | undefined> {
    const ref = doc(db, collectionPath, id);

    return new Observable<T | undefined>((subscriber) => {
      const unsubscribe = onSnapshot(
        ref,
        (snapshot) => {
          if (snapshot.exists()) {
            subscriber.next(
              this.convertTimestamps({ id: snapshot.id, ...snapshot.data() }) as T
            );
          } else {
            subscriber.next(undefined);
          }
        },
        (error) => subscriber.error(error)
      );
      return () => unsubscribe();
    });
  }

  create(collectionPath: string, data: Omit<T, 'id'>): Observable<string> {
    const ref = collection(db, collectionPath);
    const payload = {
      ...(data as object),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    return new Observable<string>((subscriber) => {
      addDoc(ref, payload)
        .then((docRef) => {
          subscriber.next(docRef.id);
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
    });
  }

  update(
    collectionPath: string,
    id: string,
    data: Partial<Omit<T, 'id'>>
  ): Observable<void> {
    const ref = doc(db, collectionPath, id);
    const payload = { ...(data as object), updatedAt: serverTimestamp() };
    return new Observable<void>((subscriber) => {
      updateDoc(ref, payload)
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
    });
  }

  delete(collectionPath: string, id: string): Observable<void> {
    const ref = doc(db, collectionPath, id);
    return new Observable<void>((subscriber) => {
      deleteDoc(ref)
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
    });
  }

  /** Write (or overwrite) a document with a known ID. */
  set(collectionPath: string, id: string, data: Omit<T, 'id'>): Observable<void> {
    const ref = doc(db, collectionPath, id);
    const payload = {
      ...(data as object),
      updatedAt: serverTimestamp(),
    };
    return new Observable<void>((subscriber) => {
      setDoc(ref, payload, { merge: true })
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
    });
  }
}
