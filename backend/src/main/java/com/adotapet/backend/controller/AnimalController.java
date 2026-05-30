package com.adotapet.backend.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.adotapet.backend.dto.AnimalRequest;
import com.adotapet.backend.dto.AnimalResponse;
import com.adotapet.backend.dto.AnimalStatusRequest;
import com.adotapet.backend.dto.RecomendacaoAnimalResponse;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelEnergia;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.Sexo;
import com.adotapet.backend.service.AnimalService;

import jakarta.validation.Valid;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/animais")
public class AnimalController {

    private final AnimalService animalService;

    public AnimalController(AnimalService animalService) {
        this.animalService = animalService;
    }

    @GetMapping
    public List<AnimalResponse> listarDisponiveis() {
        return animalService.listarDisponiveis();
    }

    @GetMapping("/{id}")
    public AnimalResponse buscarPorId(@PathVariable Integer id) {
        return animalService.buscarPorId(id);
    }

    @GetMapping("/recomendados/{adotanteId}")
    public List<RecomendacaoAnimalResponse> recomendar(@PathVariable Integer adotanteId) {
        return animalService.recomendarParaAdotante(adotanteId);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AnimalResponse> cadastrar(@Valid @RequestBody AnimalRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(animalService.cadastrar(request));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AnimalResponse> cadastrarComImagens(
            @RequestParam String nome,
            @RequestParam Especie especie,
            @RequestParam(required = false) String raca,
            @RequestParam Integer idadeMeses,
            @RequestParam Porte porte,
            @RequestParam Sexo sexo,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataResgate,
            @RequestParam NivelEnergia nivelEnergia,
            @RequestParam(defaultValue = "false") boolean bomComCriancas,
            @RequestParam(defaultValue = "false") boolean bomComAnimais,
            @RequestParam(defaultValue = "false") boolean precisaEspaco,
            @RequestParam(defaultValue = "false") boolean microchip,
            @RequestParam(defaultValue = "false") boolean castrado,
            @RequestParam(defaultValue = "false") boolean vermifugado,
            @RequestParam(defaultValue = "false") boolean vacinado,
            @RequestParam(required = false) String descricao,
            @RequestParam Integer protetorId,
            @RequestParam(value = "imagens", required = false) List<MultipartFile> imagens) {
        AnimalRequest request = new AnimalRequest(nome, especie, raca, idadeMeses, porte, sexo, dataResgate,
                nivelEnergia, bomComCriancas, bomComAnimais, precisaEspaco, microchip, castrado, vermifugado,
                vacinado, descricao, protetorId);

        return ResponseEntity.status(HttpStatus.CREATED).body(animalService.cadastrarComArquivos(request, imagens));
    }

    @PutMapping("/{id}/status")
    public AnimalResponse atualizarStatus(@PathVariable Integer id, @Valid @RequestBody AnimalStatusRequest request) {
        return animalService.atualizarStatus(id, request.status());
    }
}
