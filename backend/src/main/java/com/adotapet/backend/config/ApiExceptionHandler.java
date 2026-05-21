package com.adotapet.backend.config;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.adotapet.backend.dto.ApiErrorResponse;
import com.adotapet.backend.service.RecursoNaoEncontradoException;
import com.adotapet.backend.service.RegraNegocioException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ResponseEntity<ApiErrorResponse> notFound(RecursoNaoEncontradoException exception) {
        return build(HttpStatus.NOT_FOUND, exception.getMessage(), null);
    }

    @ExceptionHandler(RegraNegocioException.class)
    public ResponseEntity<ApiErrorResponse> business(RegraNegocioException exception) {
        return build(HttpStatus.BAD_REQUEST, exception.getMessage(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> validation(MethodArgumentNotValidException exception) {
        Map<String, String> fields = new HashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> fields.put(error.getField(), error.getDefaultMessage()));
        return build(HttpStatus.BAD_REQUEST, "Dados invalidos", fields);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> unreadable(HttpMessageNotReadableException exception) {
        return build(HttpStatus.BAD_REQUEST, "JSON invalido ou valor fora dos enums esperados", null);
    }

    @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
    public ResponseEntity<ApiErrorResponse> unauthorized(RuntimeException exception) {
        return build(HttpStatus.UNAUTHORIZED, "Credenciais invalidas", null);
    }

    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, String message, Map<String, String> fields) {
        return ResponseEntity.status(status).body(new ApiErrorResponse(
                LocalDateTime.now(),
                status.value(),
                status.getReasonPhrase(),
                message,
                fields
        ));
    }
}
