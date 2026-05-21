package com.adotapet.backend.queue;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

public class FilaManual<T> {

    private No<T> inicio;
    private No<T> fim;
    private int tamanho;

    public void enfileirar(T valor) {
        No<T> novo = new No<>(valor);
        if (fim == null) {
            inicio = novo;
            fim = novo;
        } else {
            fim.proximo = novo;
            fim = novo;
        }
        tamanho++;
    }

    public T desenfileirar() {
        if (inicio == null) {
            throw new NoSuchElementException("Fila vazia");
        }

        T valor = inicio.valor;
        inicio = inicio.proximo;
        if (inicio == null) {
            fim = null;
        }
        tamanho--;
        return valor;
    }

    public boolean estaVazia() {
        return tamanho == 0;
    }

    public int tamanho() {
        return tamanho;
    }

    public List<T> paraLista() {
        List<T> valores = new ArrayList<>();
        while (!estaVazia()) {
            valores.add(desenfileirar());
        }
        return valores;
    }

    private static class No<T> {
        private final T valor;
        private No<T> proximo;

        private No(T valor) {
            this.valor = valor;
        }
    }
}
