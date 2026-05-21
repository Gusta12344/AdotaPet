package com.adotapet.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.adotapet.backend.queue.FilaManual;

class FilaManualTest {

    @Test
    void deveRespeitarOrdemFifo() {
        FilaManual<String> fila = new FilaManual<>();

        fila.enfileirar("primeira");
        fila.enfileirar("segunda");
        fila.enfileirar("terceira");

        assertEquals("primeira", fila.desenfileirar());
        assertEquals("segunda", fila.desenfileirar());
        assertEquals("terceira", fila.desenfileirar());
        assertTrue(fila.estaVazia());
    }

    @Test
    void deveConverterParaListaNaOrdemDeChegada() {
        FilaManual<Integer> fila = new FilaManual<>();
        fila.enfileirar(10);
        fila.enfileirar(20);
        fila.enfileirar(30);

        assertEquals(List.of(10, 20, 30), fila.paraLista());
        assertTrue(fila.estaVazia());
    }
}
