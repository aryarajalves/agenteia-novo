import pytest
import os
import ast

def test_webhook_tasks_finally_close_is_implemented():
    """
    Unit test that parses the AST of webhook_tasks.py to programmatically verify
    that the process_webhook_automation task has the finally: db.close() block
    implemented for connection leak prevention.
    """
    file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "webhook_tasks", "automation.py")
    if not os.path.exists(file_path):
        file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "webhook_tasks.py")
    assert os.path.exists(file_path), f"Arquivo {file_path} não encontrado!"
    
    with open(file_path, "r", encoding="utf-8") as f:
        source_code = f.read()
        
    tree = ast.parse(source_code, filename=file_path)
    
    # Let's locate the process_webhook_automation function in the AST
    process_webhook_automation_func = None
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == "process_webhook_automation":
            process_webhook_automation_func = node
            break
            
    assert process_webhook_automation_func is not None, "Função process_webhook_automation não encontrada no arquivo!"
    
    # The function body should contain a Try block at its root level (after db = SessionLocal())
    # Let's inspect the body of process_webhook_automation
    try_node = None
    for stmt in process_webhook_automation_func.body:
        if isinstance(stmt, ast.Try):
            try_node = stmt
            break
            
    assert try_node is not None, "Bloco try principal não encontrado em process_webhook_automation!"
    
    # The try block must have a non-empty 'finalbody' containing a call to 'db.close()'
    assert len(try_node.finalbody) > 0, "Bloco finally não implementado no try principal!"
    
    # Check that finalbody calls db.close()
    finally_stmt = try_node.finalbody[0]
    
    # Check if the statement is an Expr with a Call to db.close
    assert isinstance(finally_stmt, ast.Expr), "O bloco finally deve conter uma expressão!"
    call_node = finally_stmt.value
    assert isinstance(call_node, ast.Call), "O bloco finally deve realizar uma chamada de função!"
    
    # Check that the function called is an attribute 'close' of object 'db'
    func_attribute = call_node.func
    assert isinstance(func_attribute, ast.Attribute), "A função chamada deve ser um atributo!"
    assert func_attribute.attr == "close", "O método chamado no bloco finally deve ser 'close'!"
    
    db_name = func_attribute.value
    assert isinstance(db_name, ast.Name), "O método deve ser chamado no objeto session!"
    assert db_name.id == "db", "O método 'close' deve ser chamado no objeto 'db'!"
    
    print("✅ Sucesso: O AST do arquivo prova que o bloco 'finally: db.close()' foi implementado com perfeição!")

if __name__ == "__main__":
    pytest.main(["-v", __file__])
